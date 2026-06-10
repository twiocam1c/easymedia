/**
 * 后端命令的类型安全封装。前端只通过这里调用 Tauri,不直接散用 invoke。
 */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  MediaInfo,
  ProgressEvent,
  SavedPreset,
  TaskResult,
  TaskSpec,
} from "./types";

/** 探测媒体文件元数据 */
export function probeMedia(path: string): Promise<MediaInfo> {
  return invoke<MediaInfo>("probe_media", { path });
}

/** 预览将执行的 FFmpeg 命令(L3 只读展示) */
export function previewCommand(
  info: MediaInfo,
  spec: TaskSpec,
  outputPath: string
): Promise<string[]> {
  return invoke<string[]>("preview_command", {
    info,
    spec,
    outputPath,
  });
}

/** 执行任务(进度通过 listenProgress 订阅) */
export function runTask(
  taskId: string,
  info: MediaInfo,
  spec: TaskSpec,
  outputPath: string
): Promise<TaskResult> {
  return invoke<TaskResult>("run_task", {
    taskId,
    info,
    spec,
    outputPath,
  });
}

/** 取消任务 */
export function cancelTask(taskId: string): Promise<void> {
  return invoke<void>("cancel_task", { taskId });
}

/** 在文件管理器中显示输出文件 */
export function revealInFolder(path: string): Promise<void> {
  return invoke<void>("reveal_in_folder", { path });
}

/** 订阅进度事件;返回取消订阅函数 */
export function listenProgress(
  handler: (e: ProgressEvent) => void
): Promise<UnlistenFn> {
  return listen<ProgressEvent>("progress", (event) => handler(event.payload));
}

// ---- 预设 ----

/** 读取全部预设 */
export function listPresets(): Promise<SavedPreset[]> {
  return invoke<SavedPreset[]>("list_presets");
}

/** 保存(新增/更新)预设,返回更新后的完整列表 */
export function savePreset(preset: SavedPreset): Promise<SavedPreset[]> {
  return invoke<SavedPreset[]>("save_preset", { preset });
}

/** 删除预设,返回更新后的完整列表 */
export function deletePreset(id: string): Promise<SavedPreset[]> {
  return invoke<SavedPreset[]>("delete_preset", { id });
}
