import { useStore } from "@/store/useStore";
import { formatDuration } from "@/lib/media";

/** 剪辑任务选项:用两个滑块选起止时间 */
export function TrimOptions() {
  const spec = useStore((s) => s.spec);
  const media = useStore((s) => s.media);
  const updateSpec = useStore((s) => s.updateSpec);
  if (spec.type !== "trim" || !media) return null;

  const dur = media.durationSec;

  function setStart(v: number) {
    // 起点不能超过终点
    const start = Math.min(v, spec.type === "trim" ? spec.endSec - 0.1 : v);
    updateSpec({ startSec: Math.max(0, start) });
  }
  function setEnd(v: number) {
    const end = Math.max(v, spec.type === "trim" ? spec.startSec + 0.1 : v);
    updateSpec({ endSec: Math.min(dur, end) });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">保留区间</span>
        <span className="font-mono text-accent">
          {formatDuration(spec.startSec)} – {formatDuration(spec.endSec)}
          <span className="ml-2 text-ink-faint">
            (共 {formatDuration(spec.endSec - spec.startSec)})
          </span>
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-faint">开始</span>
        <input
          type="range"
          min={0}
          max={dur}
          step={0.1}
          value={spec.startSec}
          onChange={(e) => setStart(Number(e.target.value))}
          className="accent-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-faint">结束</span>
        <input
          type="range"
          min={0}
          max={dur}
          step={0.1}
          value={spec.endSec}
          onChange={(e) => setEnd(Number(e.target.value))}
          className="accent-accent"
        />
      </label>

      <p className="text-[11px] text-ink-faint">
        无损剪切,速度极快,画质零损失。
      </p>
    </div>
  );
}
