import { useStore } from "@/store/useStore";
import { Segmented } from "@/components/ui/Segmented";
import { formatDuration } from "@/lib/media";

/** 转 GIF 任务选项:时间区间 + 帧率 + 宽度 */
export function ToGifOptions() {
  const spec = useStore((s) => s.spec);
  const media = useStore((s) => s.media);
  const updateSpec = useStore((s) => s.updateSpec);
  if (spec.type !== "toGif" || !media) return null;

  const dur = media.durationSec;

  function setStart(v: number) {
    const start = Math.min(v, spec.type === "toGif" ? spec.endSec - 0.1 : v);
    updateSpec({ startSec: Math.max(0, start) });
  }
  function setEnd(v: number) {
    const end = Math.max(v, spec.type === "toGif" ? spec.startSec + 0.1 : v);
    updateSpec({ endSec: Math.min(dur, end) });
  }

  const span = spec.endSec - spec.startSec;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">截取区间</span>
        <span className="font-mono text-accent">
          {formatDuration(spec.startSec)} – {formatDuration(spec.endSec)}
          <span className="ml-2 text-ink-faint">({span.toFixed(1)}s)</span>
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

      <Segmented<string>
        label="流畅度(帧率)"
        value={String(spec.fps)}
        onChange={(v) => updateSpec({ fps: Number(v) })}
        options={[
          { value: "8", label: "省体积", hint: "8fps" },
          { value: "12", label: "适中", hint: "12fps" },
          { value: "20", label: "流畅", hint: "20fps" },
        ]}
      />

      <Segmented<string>
        label="尺寸(宽度)"
        value={String(spec.width)}
        onChange={(v) => updateSpec({ width: Number(v) })}
        options={[
          { value: "320", label: "小", hint: "320px" },
          { value: "480", label: "中", hint: "480px" },
          { value: "640", label: "大", hint: "640px" },
        ]}
      />

      {span > 10 && (
        <p className="text-[11px] text-warn">
          区间较长,GIF 文件可能很大。建议控制在 10 秒内。
        </p>
      )}
    </div>
  );
}
