//! 前后端共享的数据结构(serde 序列化,镜像 src/lib/types.ts)。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    pub path: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub duration_sec: f64,
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub bitrate: u64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum QualityPreset {
    Small,
    Balanced,
    High,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ResolutionPreset {
    Original,
    #[serde(rename = "1080p")]
    P1080,
    #[serde(rename = "720p")]
    P720,
    #[serde(rename = "480p")]
    P480,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedOverrides {
    pub video_codec: Option<String>,
    pub crf: Option<u32>,
    pub video_bitrate: Option<String>,
    pub speed_preset: Option<String>,
    pub audio_bitrate: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressSpec {
    pub quality: QualityPreset,
    // 显式 rename 对齐前端 targetSizeMB(camelCase 默认会产生 targetSizeMb)
    #[serde(rename = "targetSizeMB")]
    pub target_size_mb: Option<f64>,
    pub resolution: ResolutionPreset,
    #[serde(default)]
    pub advanced: AdvancedOverrides,
}

/// 转格式:改变容器/编码,使其更通用(如手机可播)。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertSpec {
    /// 目标容器,如 "mp4" / "mkv" / "webm" / "mov"
    pub format: String,
    pub quality: QualityPreset,
}

/// 提取音频:从视频中抽出音轨。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractAudioSpec {
    /// 目标音频格式,如 "mp3" / "aac" / "wav"
    pub format: String,
    /// 音频码率,如 "192k";wav 等无损可忽略
    pub bitrate: String,
}

/// 剪辑:保留 [start, end] 区间(无损流复制,极快)。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrimSpec {
    pub start_sec: f64,
    pub end_sec: f64,
}

/// 转 GIF:把一段视频做成动图。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToGifSpec {
    pub start_sec: f64,
    pub end_sec: f64,
    /// 帧率,常用 10-15
    pub fps: u32,
    /// 输出宽度(像素),高度按比例,如 480
    pub width: u32,
}

/// 所有任务意图的可辨识联合。serde 用 `type` 字段区分(internally tagged)。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TaskSpec {
    Compress(CompressSpec),
    Convert(ConvertSpec),
    ExtractAudio(ExtractAudioSpec),
    Trim(TrimSpec),
    ToGif(ToGifSpec),
}

/// 用户保存的预设(名称 + 一套任务意图)。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedPreset {
    pub id: String,
    pub name: String,
    pub spec: TaskSpec,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub task_id: String,
    pub percent: f64,
    pub processed_sec: f64,
    pub speed: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskResult {
    pub task_id: String,
    pub ok: bool,
    pub output_path: Option<String>,
    pub output_size_bytes: Option<u64>,
    pub error_message: Option<String>,
}
