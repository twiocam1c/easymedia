import type { MediaKind } from "./types";

const VIDEO_EXT = new Set([
  "mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v", "mpg", "mpeg", "ts", "3gp",
]);
const AUDIO_EXT = new Set([
  "mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "opus", "aiff",
]);
const IMAGE_EXT = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "heic",
]);

/** 取小写扩展名(不含点);无扩展名返回空串 */
export function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

/** 根据文件名推断媒体大类,决定展示哪些任务卡 */
export function detectMediaKind(fileName: string): MediaKind {
  const ext = extOf(fileName);
  if (VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (IMAGE_EXT.has(ext)) return "image";
  return "unknown";
}

/** 人类可读的文件大小 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 秒 → mm:ss 或 hh:mm:ss */
export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
