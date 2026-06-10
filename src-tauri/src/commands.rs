//! Tauri 命令层:把前端意图接到真正的 ffmpeg/ffprobe 进程。
//!
//! - probe_media:调 ffprobe 探测元数据
//! - run_compress:调 ffmpeg 执行压缩,流式解析进度并 emit 事件,支持取消
//! - cancel_task:终止指定任务的子进程
//! - preview_compress_command:纯逻辑预览命令(L3 专家层只读展示)
//! - list_presets / save_preset / delete_preset:预设的本地持久化

use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

use crate::ffmpeg::{builder, probe, runner};
use crate::presets;
use crate::models::SavedPreset;
use crate::models::{MediaInfo, ProgressEvent, TaskResult, TaskSpec};

/// 正在运行的任务:taskId -> 子进程句柄,用于取消。
#[derive(Default)]
pub struct RunningTasks(pub Mutex<HashMap<String, CommandChild>>);

/// 探测媒体文件元数据。
#[tauri::command]
pub async fn probe_media(app: AppHandle, path: String) -> Result<MediaInfo, String> {
    let size_bytes = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);

    let output = app
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| format!("无法定位 ffprobe: {e}"))?
        .args(probe::probe_args(&path))
        .output()
        .await
        .map_err(|e| format!("ffprobe 执行失败: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe 返回错误: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|e| format!("解析 ffprobe 输出失败: {e}"))?;

    Ok(probe::parse_probe_json(&json, &path, size_bytes))
}

/// 预览将要执行的 FFmpeg 命令(供 L3 专家层只读展示),不执行。
#[tauri::command]
pub fn preview_command(
    info: MediaInfo,
    spec: TaskSpec,
    output_path: String,
) -> Vec<String> {
    let mut full = vec!["ffmpeg".to_string()];
    full.extend(builder::build_args(&info, &spec, &output_path));
    full
}

/// 执行任务。流式解析进度并通过 "progress" 事件推送,完成后返回结果。
#[tauri::command]
pub async fn run_task(
    app: AppHandle,
    tasks: State<'_, RunningTasks>,
    task_id: String,
    info: MediaInfo,
    spec: TaskSpec,
    output_path: String,
) -> Result<TaskResult, String> {
    let args = builder::build_args(&info, &spec, &output_path);

    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("无法定位 ffmpeg: {e}"))?
        .args(args)
        .spawn()
        .map_err(|e| format!("ffmpeg 启动失败: {e}"))?;

    // 登记子进程,供取消使用
    tasks
        .0
        .lock()
        .unwrap()
        .insert(task_id.clone(), child);

    let total_sec = info.duration_sec;
    let mut last_error = String::new();
    let mut exit_ok = false;

    // 读取进程事件流
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line);
                let snap = runner::parse_progress_block(&text);
                let percent = runner::compute_percent(snap.out_time_us, total_sec);
                let processed_sec = snap.out_time_us.unwrap_or(0) as f64 / 1_000_000.0;
                let _ = app.emit(
                    "progress",
                    ProgressEvent {
                        task_id: task_id.clone(),
                        percent,
                        processed_sec,
                        speed: snap.speed,
                    },
                );
            }
            CommandEvent::Stderr(line) => {
                // ffmpeg 把常规日志写到 stderr;保留最后内容用于报错诊断
                last_error = String::from_utf8_lossy(&line).to_string();
            }
            CommandEvent::Terminated(payload) => {
                exit_ok = payload.code == Some(0);
            }
            _ => {}
        }
    }

    // 清理登记
    tasks.0.lock().unwrap().remove(&task_id);

    if exit_ok {
        let output_size = std::fs::metadata(&output_path).map(|m| m.len()).ok();
        Ok(TaskResult {
            task_id,
            ok: true,
            output_path: Some(output_path),
            output_size_bytes: output_size,
            error_message: None,
        })
    } else {
        Ok(TaskResult {
            task_id,
            ok: false,
            output_path: None,
            output_size_bytes: None,
            error_message: Some(if last_error.is_empty() {
                "处理失败".to_string()
            } else {
                last_error
            }),
        })
    }
}

/// 取消正在运行的任务。
#[tauri::command]
pub fn cancel_task(tasks: State<'_, RunningTasks>, task_id: String) -> Result<(), String> {
    if let Some(child) = tasks.0.lock().unwrap().remove(&task_id) {
        child.kill().map_err(|e| format!("无法终止任务: {e}"))?;
    }
    Ok(())
}

/// 在系统文件管理器中显示输出文件。
#[tauri::command]
pub fn reveal_in_folder(app: AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    // 打开文件所在目录
    let parent = std::path::Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or(path.clone());
    app.opener()
        .open_path(parent, None::<&str>)
        .map_err(|e| format!("无法打开文件夹: {e}"))
}

// ---- 预设持久化 ----

/// 预设 JSON 文件路径(应用配置目录下 presets.json)。
fn presets_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法定位配置目录: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("无法创建配置目录: {e}"))?;
    Ok(dir.join("presets.json"))
}

/// 读取全部预设。文件不存在时返回空列表。
#[tauri::command]
pub fn list_presets(app: AppHandle) -> Result<Vec<SavedPreset>, String> {
    let path = presets_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = std::fs::read_to_string(&path).map_err(|e| format!("读取预设失败: {e}"))?;
    // 文件损坏时退化为空列表,而非让整个功能不可用
    Ok(serde_json::from_str(&text).unwrap_or_default())
}

/// 保存(新增或更新)一个预设,返回更新后的完整列表。
#[tauri::command]
pub fn save_preset(app: AppHandle, preset: SavedPreset) -> Result<Vec<SavedPreset>, String> {
    let current = list_presets(app.clone())?;
    let updated = presets::upsert_preset(&current, preset);
    write_presets(&app, &updated)?;
    Ok(updated)
}

/// 删除一个预设,返回更新后的完整列表。
#[tauri::command]
pub fn delete_preset(app: AppHandle, id: String) -> Result<Vec<SavedPreset>, String> {
    let current = list_presets(app.clone())?;
    let updated = presets::remove_preset(&current, &id);
    write_presets(&app, &updated)?;
    Ok(updated)
}

fn write_presets(app: &AppHandle, presets: &[SavedPreset]) -> Result<(), String> {
    let path = presets_path(app)?;
    let text =
        serde_json::to_string_pretty(presets).map_err(|e| format!("序列化预设失败: {e}"))?;
    std::fs::write(&path, text).map_err(|e| format!("写入预设失败: {e}"))
}
