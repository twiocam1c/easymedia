//! EasyMedia 后端库。
//!
//! 模块划分:
//! - models:前后端共享数据结构
//! - ffmpeg::builder:意图 → FFmpeg 参数(纯函数)
//! - ffmpeg::probe:ffprobe JSON 解析
//! - ffmpeg::runner:进度解析
//! - commands:Tauri 命令层,接通真实 ffmpeg/ffprobe 进程

pub mod commands;
pub mod ffmpeg;
pub mod models;
pub mod presets;

use commands::RunningTasks;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(RunningTasks::default())
        .invoke_handler(tauri::generate_handler![
            commands::probe_media,
            commands::preview_command,
            commands::run_task,
            commands::cancel_task,
            commands::reveal_in_folder,
            commands::list_presets,
            commands::save_preset,
            commands::delete_preset,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
