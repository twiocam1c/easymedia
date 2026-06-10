import type {
  TaskSpec,
  TaskType,
  CompressSpec,
  ConvertSpec,
  ExtractAudioSpec,
  TrimSpec,
  ToGifSpec,
} from "./types";

/** 任务元信息:用于任务选择器展示 */
export interface TaskMeta {
  type: TaskType;
  label: string;
  icon: string;
  hint: string;
}

export const TASK_METAS: TaskMeta[] = [
  { type: "compress", label: "压缩", icon: "🗜️", hint: "变小,方便发送" },
  { type: "convert", label: "转格式", icon: "🔄", hint: "换成通用格式" },
  { type: "extractAudio", label: "提取音频", icon: "🎵", hint: "只要声音" },
  { type: "trim", label: "剪辑", icon: "✂️", hint: "截取一段" },
  { type: "toGif", label: "转 GIF", icon: "🎞️", hint: "做成动图" },
];

export function defaultCompressSpec(): CompressSpec {
  return {
    type: "compress",
    quality: "balanced",
    targetSizeMB: null,
    resolution: "original",
    advanced: {
      videoCodec: null,
      crf: null,
      videoBitrate: null,
      speedPreset: null,
      audioBitrate: null,
    },
  };
}

export function defaultConvertSpec(): ConvertSpec {
  return { type: "convert", format: "mp4", quality: "balanced" };
}

export function defaultExtractAudioSpec(): ExtractAudioSpec {
  return { type: "extractAudio", format: "mp3", bitrate: "192k" };
}

/** 剪辑默认取整段(end=durationSec) */
export function defaultTrimSpec(durationSec: number): TrimSpec {
  return { type: "trim", startSec: 0, endSec: durationSec };
}

/** GIF 默认取开头最多 5 秒 */
export function defaultToGifSpec(durationSec: number): ToGifSpec {
  return {
    type: "toGif",
    startSec: 0,
    endSec: Math.min(durationSec, 5),
    fps: 12,
    width: 480,
  };
}

/** 按任务类型生成默认 spec */
export function defaultSpecFor(type: TaskType, durationSec: number): TaskSpec {
  switch (type) {
    case "compress":
      return defaultCompressSpec();
    case "convert":
      return defaultConvertSpec();
    case "extractAudio":
      return defaultExtractAudioSpec();
    case "trim":
      return defaultTrimSpec(durationSec);
    case "toGif":
      return defaultToGifSpec(durationSec);
  }
}

/** 每种任务的输出文件名后缀 + 扩展名 */
function outputSuffixAndExt(spec: TaskSpec): { suffix: string; ext: string } {
  switch (spec.type) {
    case "compress":
      return { suffix: "_compressed", ext: "mp4" };
    case "convert":
      return { suffix: "_converted", ext: spec.format };
    case "extractAudio":
      return { suffix: "_audio", ext: spec.format };
    case "trim":
      return { suffix: "_clip", ext: "mp4" };
    case "toGif":
      return { suffix: "", ext: "gif" };
  }
}

/**
 * 由输入路径 + 任务类型推导输出路径(同目录,加后缀,换扩展名)。
 * 例:C:\v\clip.mov + extractAudio(mp3) -> C:\v\clip_audio.mp3
 */
export function deriveOutputPath(inputPath: string, spec: TaskSpec): string {
  const sep = inputPath.includes("\\") ? "\\" : "/";
  const slash = Math.max(inputPath.lastIndexOf("\\"), inputPath.lastIndexOf("/"));
  const dir = slash >= 0 ? inputPath.slice(0, slash) : "";
  const file = slash >= 0 ? inputPath.slice(slash + 1) : inputPath;
  const dot = file.lastIndexOf(".");
  const stem = dot >= 0 ? file.slice(0, dot) : file;
  const { suffix, ext } = outputSuffixAndExt(spec);
  const name = `${stem}${suffix}.${ext}`;
  return dir ? `${dir}${sep}${name}` : name;
}

/** 生成简单的任务 id */
export function makeTaskId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
