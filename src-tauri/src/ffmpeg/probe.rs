//! 媒体探测:调用 ffprobe 获取元数据,解析 JSON 为 MediaInfo。
//!
//! 纯解析逻辑(parse_probe_json)与进程调用分离,前者可单元测试。

use crate::models::MediaInfo;
use serde_json::Value;
use std::path::Path;

/// 从 ffprobe 的 JSON 输出 + 文件路径/大小,解析出 MediaInfo。
///
/// 容错:字段缺失时退化为 0 / None,而非报错。
pub fn parse_probe_json(json: &Value, path: &str, size_bytes: u64) -> MediaInfo {
    let format = json.get("format");
    let streams = json.get("streams").and_then(|s| s.as_array());

    let duration_sec = format
        .and_then(|f| f.get("duration"))
        .and_then(|d| d.as_str())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    let bitrate = format
        .and_then(|f| f.get("bit_rate"))
        .and_then(|b| b.as_str())
        .and_then(|b| b.parse::<u64>().ok())
        .unwrap_or(0);

    let format_name = format
        .and_then(|f| f.get("format_name"))
        .and_then(|n| n.as_str())
        .unwrap_or("")
        .to_string();

    let mut width = 0u32;
    let mut height = 0u32;
    let mut video_codec: Option<String> = None;
    let mut audio_codec: Option<String> = None;

    if let Some(streams) = streams {
        for s in streams {
            let codec_type = s.get("codec_type").and_then(|c| c.as_str()).unwrap_or("");
            let codec_name = s
                .get("codec_name")
                .and_then(|c| c.as_str())
                .map(|c| c.to_string());
            match codec_type {
                "video" if video_codec.is_none() => {
                    video_codec = codec_name;
                    width = s.get("width").and_then(|w| w.as_u64()).unwrap_or(0) as u32;
                    height = s.get("height").and_then(|h| h.as_u64()).unwrap_or(0) as u32;
                }
                "audio" if audio_codec.is_none() => {
                    audio_codec = codec_name;
                }
                _ => {}
            }
        }
    }

    let file_name = Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(path)
        .to_string();

    MediaInfo {
        path: path.to_string(),
        file_name,
        size_bytes,
        duration_sec,
        width,
        height,
        format: format_name,
        video_codec,
        audio_codec,
        bitrate,
    }
}

/// ffprobe 标准参数:输出 JSON,包含 format 与 streams。
pub fn probe_args(path: &str) -> Vec<String> {
    vec![
        "-v".into(),
        "quiet".into(),
        "-print_format".into(),
        "json".into(),
        "-show_format".into(),
        "-show_streams".into(),
        path.into(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_typical_video() {
        let v = json!({
            "format": {
                "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
                "duration": "60.5",
                "bit_rate": "14000000"
            },
            "streams": [
                { "codec_type": "video", "codec_name": "h264", "width": 1920, "height": 1080 },
                { "codec_type": "audio", "codec_name": "aac" }
            ]
        });
        let info = parse_probe_json(&v, "C:/videos/clip.mp4", 100);
        assert_eq!(info.duration_sec, 60.5);
        assert_eq!(info.width, 1920);
        assert_eq!(info.height, 1080);
        assert_eq!(info.video_codec.as_deref(), Some("h264"));
        assert_eq!(info.audio_codec.as_deref(), Some("aac"));
        assert_eq!(info.bitrate, 14_000_000);
        assert_eq!(info.file_name, "clip.mp4");
    }

    #[test]
    fn handles_audio_only() {
        let v = json!({
            "format": { "format_name": "mp3", "duration": "180.0" },
            "streams": [ { "codec_type": "audio", "codec_name": "mp3" } ]
        });
        let info = parse_probe_json(&v, "song.mp3", 5000);
        assert_eq!(info.width, 0);
        assert_eq!(info.height, 0);
        assert!(info.video_codec.is_none());
        assert_eq!(info.audio_codec.as_deref(), Some("mp3"));
    }

    #[test]
    fn tolerates_missing_fields() {
        let v = json!({});
        let info = parse_probe_json(&v, "broken.mp4", 0);
        assert_eq!(info.duration_sec, 0.0);
        assert_eq!(info.bitrate, 0);
        assert_eq!(info.format, "");
        assert!(info.video_codec.is_none());
    }

    #[test]
    fn picks_first_video_stream_only() {
        let v = json!({
            "format": { "duration": "10" },
            "streams": [
                { "codec_type": "video", "codec_name": "h264", "width": 1280, "height": 720 },
                { "codec_type": "video", "codec_name": "hevc", "width": 640, "height": 360 }
            ]
        });
        let info = parse_probe_json(&v, "x.mp4", 1);
        assert_eq!(info.width, 1280);
        assert_eq!(info.video_codec.as_deref(), Some("h264"));
    }
}
