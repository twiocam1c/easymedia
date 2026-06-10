//! 执行器:解析 ffmpeg `-progress pipe:1` 的结构化输出。
//!
//! ffmpeg 以 key=value 行的形式输出进度,每个进度块以 `progress=continue`
//! 或 `progress=end` 结尾。这里只负责解析(纯函数,可测试);实际 spawn 进程
//! 与事件推送在 commands 层用 Tauri shell 插件完成。

/// 单次进度快照。
#[derive(Debug, Clone, PartialEq, Default)]
pub struct ProgressSnapshot {
    /// 已处理的输出时间(微秒)
    pub out_time_us: Option<u64>,
    /// 速度,如 "2.1x"
    pub speed: Option<String>,
    /// 是否到达 end
    pub ended: bool,
}

/// 解析累积的进度文本块,返回最新的快照。
///
/// 由于进度是持续追加的,这里取最后出现的各字段值。
pub fn parse_progress_block(text: &str) -> ProgressSnapshot {
    let mut snap = ProgressSnapshot::default();
    for line in text.lines() {
        let line = line.trim();
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        let value = value.trim();
        match key {
            "out_time_us" | "out_time_ms" => {
                // 注意:ffmpeg 的 out_time_ms 实际单位也是微秒(历史遗留)
                if let Ok(us) = value.parse::<u64>() {
                    snap.out_time_us = Some(us);
                }
            }
            "speed" => {
                if value != "N/A" && !value.is_empty() {
                    snap.speed = Some(value.to_string());
                }
            }
            "progress" => {
                if value == "end" {
                    snap.ended = true;
                }
            }
            _ => {}
        }
    }
    snap
}

/// 由已处理时间(微秒)与总时长(秒)计算百分比,限制在 0-100。
pub fn compute_percent(out_time_us: Option<u64>, total_sec: f64) -> f64 {
    if total_sec <= 0.0 {
        return 0.0;
    }
    let processed_sec = out_time_us.unwrap_or(0) as f64 / 1_000_000.0;
    ((processed_sec / total_sec) * 100.0).clamp(0.0, 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_progress_fields() {
        let block = "\
frame=120\n\
fps=30\n\
out_time_us=4000000\n\
speed=2.1x\n\
progress=continue\n";
        let snap = parse_progress_block(block);
        assert_eq!(snap.out_time_us, Some(4_000_000));
        assert_eq!(snap.speed.as_deref(), Some("2.1x"));
        assert!(!snap.ended);
    }

    #[test]
    fn detects_end() {
        let snap = parse_progress_block("out_time_us=9000000\nprogress=end\n");
        assert!(snap.ended);
    }

    #[test]
    fn ignores_na_speed() {
        let snap = parse_progress_block("speed=N/A\nprogress=continue\n");
        assert!(snap.speed.is_none());
    }

    #[test]
    fn takes_latest_value_in_block() {
        let block = "out_time_us=1000000\nout_time_us=5000000\n";
        let snap = parse_progress_block(block);
        assert_eq!(snap.out_time_us, Some(5_000_000));
    }

    #[test]
    fn percent_is_computed_and_clamped() {
        assert_eq!(compute_percent(Some(30_000_000), 60.0), 50.0);
        // 超出总时长应被截断到 100
        assert_eq!(compute_percent(Some(120_000_000), 60.0), 100.0);
    }

    #[test]
    fn percent_guards_zero_duration() {
        assert_eq!(compute_percent(Some(1_000_000), 0.0), 0.0);
    }

    #[test]
    fn percent_handles_missing_time() {
        assert_eq!(compute_percent(None, 60.0), 0.0);
    }
}
