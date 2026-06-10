//! 命令构建器:把用户意图(CompressSpec)翻译成 FFmpeg 参数数组。
//!
//! 设计原则:
//! - 纯函数,不触碰文件系统/进程,便于单元测试。
//! - 参数以 Vec<String> 返回,绝不拼接 shell 字符串(防注入)。
//! - 三层 UI 最终都落到 CompressSpec;L3 的 advanced 字段优先级最高。

use crate::models::{
    CompressSpec, ConvertSpec, ExtractAudioSpec, MediaInfo, QualityPreset, ResolutionPreset,
    TaskSpec, ToGifSpec, TrimSpec,
};

/// 目标大小模式下,音频预留的码率(bps)。
const AUDIO_BITRATE_BPS: u64 = 128_000;
/// 反推视频码率时留出的安全余量(容器开销 + 码控波动)。
const SIZE_SAFETY_FACTOR: f64 = 0.97;

/// 画质档位 → CRF(libx264 语义,越小越清晰)。
fn crf_for_quality(q: QualityPreset) -> u32 {
    match q {
        QualityPreset::Small => 30,
        QualityPreset::Balanced => 26,
        QualityPreset::High => 22,
    }
}

/// 分辨率档位 → 目标高度(像素)。Original 返回 None。
fn target_height(r: ResolutionPreset) -> Option<u32> {
    match r {
        ResolutionPreset::Original => None,
        ResolutionPreset::P1080 => Some(1080),
        ResolutionPreset::P720 => Some(720),
        ResolutionPreset::P480 => Some(480),
    }
}

/// 由目标文件大小反推视频码率(bps)。
///
/// 公式:可用视频比特 = 目标字节 * 8 * 安全系数 - 音频占用,再除以时长。
/// 返回至少 100kbps,避免时长过长导致码率过低出现马赛克兜底失败。
pub fn bitrate_for_target_size(target_mb: f64, duration_sec: f64) -> u64 {
    if duration_sec <= 0.0 || target_mb <= 0.0 {
        return 100_000;
    }
    let target_bits = target_mb * 1024.0 * 1024.0 * 8.0 * SIZE_SAFETY_FACTOR;
    let audio_bits = AUDIO_BITRATE_BPS as f64 * duration_sec;
    let video_bits = (target_bits - audio_bits).max(0.0);
    let bps = (video_bits / duration_sec) as u64;
    bps.max(100_000)
}

/// 选择视频编码器:优先 advanced 覆盖,否则默认 libx264(兼容性最佳)。
fn pick_video_codec(spec: &CompressSpec) -> String {
    spec.advanced
        .video_codec
        .clone()
        .unwrap_or_else(|| "libx264".to_string())
}

/// 选择编码速度预设。
fn pick_speed_preset(spec: &CompressSpec) -> String {
    spec.advanced
        .speed_preset
        .clone()
        .unwrap_or_else(|| "medium".to_string())
}

/// 选择音频码率。
fn pick_audio_bitrate(spec: &CompressSpec) -> String {
    spec.advanced
        .audio_bitrate
        .clone()
        .unwrap_or_else(|| "128k".to_string())
}

/// 构建压缩任务的 FFmpeg 参数(不含 ffmpeg 可执行名本身)。
///
/// 优先级:advanced.crf / advanced.video_bitrate(L3) > targetSizeMB(L2 大小)
/// > quality 档位(L2/L1 默认)。
pub fn build_compress_args(
    info: &MediaInfo,
    spec: &CompressSpec,
    output_path: &str,
) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    // 覆盖输出 + 输入
    args.push("-y".into());
    args.push("-i".into());
    args.push(info.path.clone());

    // 视频编码器
    args.push("-c:v".into());
    args.push(pick_video_codec(spec));

    // 码控:三选一,按优先级
    if let Some(bitrate) = &spec.advanced.video_bitrate {
        // L3 显式码率
        args.push("-b:v".into());
        args.push(bitrate.clone());
    } else if let Some(crf) = spec.advanced.crf {
        // L3 显式 CRF
        args.push("-crf".into());
        args.push(crf.to_string());
    } else if let Some(target_mb) = spec.target_size_mb {
        // L2 目标大小 → 反推码率
        let bps = bitrate_for_target_size(target_mb, info.duration_sec);
        args.push("-b:v".into());
        args.push(format!("{}k", bps / 1000));
    } else {
        // L1/L2 画质档位 → CRF
        args.push("-crf".into());
        args.push(crf_for_quality(spec.quality).to_string());
    }

    // 编码速度
    args.push("-preset".into());
    args.push(pick_speed_preset(spec));

    // 缩放滤镜(仅在指定且小于原始高度时;-2 保持偶数宽度)
    if let Some(h) = target_height(spec.resolution) {
        if info.height == 0 || h < info.height {
            args.push("-vf".into());
            args.push(format!("scale=-2:{}", h));
        }
    }

    // 音频
    args.push("-c:a".into());
    args.push("aac".into());
    args.push("-b:a".into());
    args.push(pick_audio_bitrate(spec));

    // 进度结构化输出到 stdout,便于解析
    args.push("-progress".into());
    args.push("pipe:1".into());
    args.push("-nostats".into());

    args.push(output_path.into());
    args
}

/// 进度输出参数(所有任务通用):结构化进度到 stdout。
fn push_progress_args(args: &mut Vec<String>) {
    args.push("-progress".into());
    args.push("pipe:1".into());
    args.push("-nostats".into());
}

/// 任务分派:按 TaskSpec 类型选择对应 builder。
pub fn build_args(info: &MediaInfo, spec: &TaskSpec, output_path: &str) -> Vec<String> {
    match spec {
        TaskSpec::Compress(s) => build_compress_args(info, s, output_path),
        TaskSpec::Convert(s) => build_convert_args(info, s, output_path),
        TaskSpec::ExtractAudio(s) => build_extract_audio_args(info, s, output_path),
        TaskSpec::Trim(s) => build_trim_args(info, s, output_path),
        TaskSpec::ToGif(s) => build_to_gif_args(info, s, output_path),
    }
}

/// 转格式:重新编码到目标容器。质量档位映射 CRF,音频统一 AAC。
pub fn build_convert_args(
    _info: &MediaInfo,
    spec: &ConvertSpec,
    output_path: &str,
) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    args.push("-y".into());
    args.push("-i".into());
    args.push(_info.path.clone());

    // webm 用 VP9+Opus,其余用 H.264+AAC(兼容性最佳)
    if spec.format == "webm" {
        args.push("-c:v".into());
        args.push("libvpx-vp9".into());
        args.push("-crf".into());
        args.push(crf_for_quality(spec.quality).to_string());
        args.push("-b:v".into());
        args.push("0".into());
        args.push("-c:a".into());
        args.push("libopus".into());
    } else {
        args.push("-c:v".into());
        args.push("libx264".into());
        args.push("-crf".into());
        args.push(crf_for_quality(spec.quality).to_string());
        args.push("-preset".into());
        args.push("medium".into());
        args.push("-c:a".into());
        args.push("aac".into());
    }

    push_progress_args(&mut args);
    args.push(output_path.into());
    args
}

/// 提取音频:不要视频流(-vn),按格式选编码器。
pub fn build_extract_audio_args(
    info: &MediaInfo,
    spec: &ExtractAudioSpec,
    output_path: &str,
) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    args.push("-y".into());
    args.push("-i".into());
    args.push(info.path.clone());
    args.push("-vn".into()); // 去掉视频流

    match spec.format.as_str() {
        "wav" => {
            // 无损 PCM,忽略码率
            args.push("-c:a".into());
            args.push("pcm_s16le".into());
        }
        "aac" => {
            args.push("-c:a".into());
            args.push("aac".into());
            args.push("-b:a".into());
            args.push(spec.bitrate.clone());
        }
        _ => {
            // 默认 mp3
            args.push("-c:a".into());
            args.push("libmp3lame".into());
            args.push("-b:a".into());
            args.push(spec.bitrate.clone());
        }
    }

    push_progress_args(&mut args);
    args.push(output_path.into());
    args
}

/// 剪辑:无损流复制保留 [start, end]。-ss/-to 放输入前更快,-c copy 不重编码。
pub fn build_trim_args(info: &MediaInfo, spec: &TrimSpec, output_path: &str) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    args.push("-y".into());
    args.push("-ss".into());
    args.push(format!("{:.3}", spec.start_sec));
    args.push("-to".into());
    args.push(format!("{:.3}", spec.end_sec));
    args.push("-i".into());
    args.push(info.path.clone());
    args.push("-c".into());
    args.push("copy".into());

    push_progress_args(&mut args);
    args.push(output_path.into());
    args
}

/// 转 GIF:截取区间,设定 fps 与宽度。用 palettegen/paletteuse 提升质量。
pub fn build_to_gif_args(info: &MediaInfo, spec: &ToGifSpec, output_path: &str) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    args.push("-y".into());
    args.push("-ss".into());
    args.push(format!("{:.3}", spec.start_sec));
    args.push("-to".into());
    args.push(format!("{:.3}", spec.end_sec));
    args.push("-i".into());
    args.push(info.path.clone());

    // 高质量 GIF:生成调色板再应用
    let filter = format!(
        "fps={},scale={}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        spec.fps, spec.width
    );
    args.push("-vf".into());
    args.push(filter);

    push_progress_args(&mut args);
    args.push(output_path.into());
    args
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::AdvancedOverrides;

    fn sample_info() -> MediaInfo {
        MediaInfo {
            path: "C:/videos/in.mp4".into(),
            file_name: "in.mp4".into(),
            size_bytes: 100 * 1024 * 1024,
            duration_sec: 60.0,
            width: 1920,
            height: 1080,
            format: "mp4".into(),
            video_codec: Some("h264".into()),
            audio_codec: Some("aac".into()),
            bitrate: 14_000_000,
        }
    }

    fn base_spec() -> CompressSpec {
        CompressSpec {
            quality: QualityPreset::Balanced,
            target_size_mb: None,
            resolution: ResolutionPreset::Original,
            advanced: AdvancedOverrides::default(),
        }
    }

    /// 在参数数组里找到 flag 后面紧跟的值
    fn value_after<'a>(args: &'a [String], flag: &str) -> Option<&'a str> {
        args.iter()
            .position(|a| a == flag)
            .and_then(|i| args.get(i + 1))
            .map(|s| s.as_str())
    }

    #[test]
    fn balanced_quality_uses_crf_26() {
        let args = build_compress_args(&sample_info(), &base_spec(), "out.mp4");
        assert_eq!(value_after(&args, "-crf"), Some("26"));
    }

    #[test]
    fn small_and_high_map_to_expected_crf() {
        let mut spec = base_spec();
        spec.quality = QualityPreset::Small;
        let args = build_compress_args(&sample_info(), &spec, "out.mp4");
        assert_eq!(value_after(&args, "-crf"), Some("30"));

        spec.quality = QualityPreset::High;
        let args = build_compress_args(&sample_info(), &spec, "out.mp4");
        assert_eq!(value_after(&args, "-crf"), Some("22"));
    }

    #[test]
    fn input_and_output_are_passed_as_separate_args() {
        // 防注入:路径必须作为独立参数,不拼接
        let args = build_compress_args(&sample_info(), &base_spec(), "C:/out dir/out.mp4");
        assert_eq!(value_after(&args, "-i"), Some("C:/videos/in.mp4"));
        assert_eq!(args.last().map(|s| s.as_str()), Some("C:/out dir/out.mp4"));
    }

    #[test]
    fn target_size_switches_to_bitrate_mode() {
        let mut spec = base_spec();
        spec.target_size_mb = Some(25.0);
        let args = build_compress_args(&sample_info(), &spec, "out.mp4");
        // 应使用 -b:v 而非 -crf
        assert!(value_after(&args, "-b:v").is_some());
        assert!(value_after(&args, "-crf").is_none());
    }

    #[test]
    fn advanced_crf_overrides_quality() {
        let mut spec = base_spec();
        spec.quality = QualityPreset::Small; // 档位本应 30
        spec.advanced.crf = Some(18);
        let args = build_compress_args(&sample_info(), &spec, "out.mp4");
        assert_eq!(value_after(&args, "-crf"), Some("18"));
    }

    #[test]
    fn advanced_bitrate_takes_priority_over_target_size() {
        let mut spec = base_spec();
        spec.target_size_mb = Some(25.0);
        spec.advanced.video_bitrate = Some("3M".into());
        let args = build_compress_args(&sample_info(), &spec, "out.mp4");
        assert_eq!(value_after(&args, "-b:v"), Some("3M"));
    }

    #[test]
    fn advanced_video_codec_override() {
        let mut spec = base_spec();
        spec.advanced.video_codec = Some("libx265".into());
        let args = build_compress_args(&sample_info(), &spec, "out.mp4");
        assert_eq!(value_after(&args, "-c:v"), Some("libx265"));
    }

    #[test]
    fn resolution_adds_scale_filter_when_downscaling() {
        let mut spec = base_spec();
        spec.resolution = ResolutionPreset::P720;
        let args = build_compress_args(&sample_info(), &spec, "out.mp4");
        assert_eq!(value_after(&args, "-vf"), Some("scale=-2:720"));
    }

    #[test]
    fn resolution_skips_scale_when_not_downscaling() {
        // 源是 1080,选 1080p 不应加 scale(1080 < 1080 为假)
        let mut spec = base_spec();
        spec.resolution = ResolutionPreset::P1080;
        let args = build_compress_args(&sample_info(), &spec, "out.mp4");
        assert!(value_after(&args, "-vf").is_none());
    }

    #[test]
    fn original_resolution_has_no_scale_filter() {
        let args = build_compress_args(&sample_info(), &base_spec(), "out.mp4");
        assert!(value_after(&args, "-vf").is_none());
    }

    #[test]
    fn bitrate_for_target_size_is_reasonable() {
        // 25MB / 60s ≈ 3.4Mbps 视频(扣音频后)
        let bps = bitrate_for_target_size(25.0, 60.0);
        assert!(bps > 2_500_000 && bps < 3_600_000, "got {bps}");
    }

    #[test]
    fn bitrate_for_target_size_guards_invalid_input() {
        assert_eq!(bitrate_for_target_size(0.0, 60.0), 100_000);
        assert_eq!(bitrate_for_target_size(25.0, 0.0), 100_000);
    }

    #[test]
    fn bitrate_has_floor_for_very_long_media() {
        // 极长视频 + 小目标 → 不应低于 100kbps 下限
        let bps = bitrate_for_target_size(1.0, 100_000.0);
        assert_eq!(bps, 100_000);
    }

    #[test]
    fn always_includes_progress_pipe() {
        let args = build_compress_args(&sample_info(), &base_spec(), "out.mp4");
        assert_eq!(value_after(&args, "-progress"), Some("pipe:1"));
    }

    // ---- 新任务 builder 测试 ----

    #[test]
    fn extract_audio_drops_video_stream() {
        let spec = ExtractAudioSpec {
            format: "mp3".into(),
            bitrate: "192k".into(),
        };
        let args = build_extract_audio_args(&sample_info(), &spec, "out.mp3");
        assert!(args.iter().any(|a| a == "-vn"), "应包含 -vn 去视频");
        assert_eq!(value_after(&args, "-c:a"), Some("libmp3lame"));
        assert_eq!(value_after(&args, "-b:a"), Some("192k"));
    }

    #[test]
    fn extract_audio_wav_is_lossless_pcm() {
        let spec = ExtractAudioSpec {
            format: "wav".into(),
            bitrate: "192k".into(),
        };
        let args = build_extract_audio_args(&sample_info(), &spec, "out.wav");
        assert_eq!(value_after(&args, "-c:a"), Some("pcm_s16le"));
        // wav 不应带码率
        assert!(value_after(&args, "-b:a").is_none());
    }

    #[test]
    fn convert_webm_uses_vp9_opus() {
        let spec = ConvertSpec {
            format: "webm".into(),
            quality: QualityPreset::Balanced,
        };
        let args = build_convert_args(&sample_info(), &spec, "out.webm");
        assert_eq!(value_after(&args, "-c:v"), Some("libvpx-vp9"));
        assert_eq!(value_after(&args, "-c:a"), Some("libopus"));
    }

    #[test]
    fn convert_mp4_uses_h264_aac() {
        let spec = ConvertSpec {
            format: "mp4".into(),
            quality: QualityPreset::High,
        };
        let args = build_convert_args(&sample_info(), &spec, "out.mp4");
        assert_eq!(value_after(&args, "-c:v"), Some("libx264"));
        assert_eq!(value_after(&args, "-c:a"), Some("aac"));
        assert_eq!(value_after(&args, "-crf"), Some("22"));
    }

    #[test]
    fn trim_uses_lossless_copy_with_range() {
        let spec = TrimSpec {
            start_sec: 5.0,
            end_sec: 12.5,
        };
        let args = build_trim_args(&sample_info(), &spec, "out.mp4");
        assert_eq!(value_after(&args, "-ss"), Some("5.000"));
        assert_eq!(value_after(&args, "-to"), Some("12.500"));
        assert_eq!(value_after(&args, "-c"), Some("copy"));
    }

    #[test]
    fn gif_builds_palette_filter() {
        let spec = ToGifSpec {
            start_sec: 1.0,
            end_sec: 3.0,
            fps: 12,
            width: 480,
        };
        let args = build_to_gif_args(&sample_info(), &spec, "out.gif");
        let vf = value_after(&args, "-vf").unwrap();
        assert!(vf.contains("fps=12"));
        assert!(vf.contains("scale=480:-1"));
        assert!(vf.contains("palettegen"));
        assert!(vf.contains("paletteuse"));
    }

    #[test]
    fn dispatch_routes_by_variant() {
        let info = sample_info();
        // Compress 走 CRF
        let c = build_args(&info, &TaskSpec::Compress(base_spec()), "o.mp4");
        assert!(value_after(&c, "-crf").is_some());
        // Trim 走 copy
        let t = build_args(
            &info,
            &TaskSpec::Trim(TrimSpec {
                start_sec: 0.0,
                end_sec: 1.0,
            }),
            "o.mp4",
        );
        assert_eq!(value_after(&t, "-c"), Some("copy"));
    }
}
