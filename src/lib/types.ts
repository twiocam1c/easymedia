/**
 * 前后端共享的类型契约。
 * 前端表达"用户意图"(TaskSpec),后端 builder 将其翻译为 FFmpeg 参数。
 */

/** 拖入文件经探测后的媒体信息 */
export interface MediaInfo {
  path: string;
  fileName: string;
  /** 字节 */
  sizeBytes: number;
  /** 秒 */
  durationSec: number;
  width: number;
  height: number;
  /** 容器格式,如 "mp4" */
  format: string;
  videoCodec: string | null;
  audioCodec: string | null;
  /** 总码率 bps,可能为 0 */
  bitrate: number;
}

/** 媒体大类——决定展示哪些任务 */
export type MediaKind = "video" | "audio" | "image" | "unknown";

/** 当前支持的任务类型(首版仅 compress,其余为占位) */
export type TaskType =
  | "compress"
  | "convert"
  | "extractAudio"
  | "trim"
  | "toGif";

/** L2 人话画质档位 */
export type QualityPreset = "small" | "balanced" | "high";

/** 目标分辨率档位 */
export type ResolutionPreset = "original" | "1080p" | "720p" | "480p";

/**
 * 压缩任务的用户意图。
 * 三层 UI 都最终落到这个结构:
 * - L1 用默认值
 * - L2 改 quality / targetSizeMB / resolution
 * - L3 直接覆盖 advanced 字段
 */
export interface CompressSpec {
  type: "compress";
  /** L2:画质档位 */
  quality: QualityPreset;
  /** L2:目标大小(MB),设置后优先按大小反推码率;null 表示按画质档位走 CRF */
  targetSizeMB: number | null;
  /** L2:分辨率 */
  resolution: ResolutionPreset;
  /** L3 专家覆盖项(均可选,留空则由画质档位推导) */
  advanced: AdvancedOverrides;
}

/** L3 专家层:直接操作 FFmpeg 真实参数 */
export interface AdvancedOverrides {
  /** 视频编码器,如 libx264 / libx265 */
  videoCodec: string | null;
  /** CRF 质量因子(0-51,越小越清晰),与码率二选一 */
  crf: number | null;
  /** 目标视频码率,如 "2M";设置后忽略 crf */
  videoBitrate: string | null;
  /** 编码速度预设,如 medium / fast / slow */
  speedPreset: string | null;
  /** 音频码率,如 "128k" */
  audioBitrate: string | null;
}

/** 转格式任务:改容器/编码使其更通用 */
export interface ConvertSpec {
  type: "convert";
  /** 目标容器,如 mp4 / mkv / webm / mov */
  format: string;
  quality: QualityPreset;
}

/** 提取音频任务 */
export interface ExtractAudioSpec {
  type: "extractAudio";
  /** 音频格式 mp3 / aac / wav */
  format: string;
  /** 码率,如 "192k"(wav 忽略) */
  bitrate: string;
}

/** 剪辑任务:保留 [startSec, endSec] 区间(无损) */
export interface TrimSpec {
  type: "trim";
  startSec: number;
  endSec: number;
}

/** 转 GIF 任务 */
export interface ToGifSpec {
  type: "toGif";
  startSec: number;
  endSec: number;
  /** 帧率 */
  fps: number;
  /** 输出宽度(像素) */
  width: number;
}

/** 所有任务意图的可辨识联合,用 type 字段区分 */
export type TaskSpec =
  | CompressSpec
  | ConvertSpec
  | ExtractAudioSpec
  | TrimSpec
  | ToGifSpec;

/** 后端执行进度事件 */
export interface ProgressEvent {
  taskId: string;
  /** 0-100 */
  percent: number;
  /** 已处理时间(秒) */
  processedSec: number;
  /** 当前速度,如 "2.1x" */
  speed: string | null;
}

/** 任务最终结果 */
export interface TaskResult {
  taskId: string;
  ok: boolean;
  outputPath: string | null;
  /** 输出文件大小(字节) */
  outputSizeBytes: number | null;
  errorMessage: string | null;
}

/** 用户保存的预设 */
export interface SavedPreset {
  id: string;
  name: string;
  spec: TaskSpec;
}
