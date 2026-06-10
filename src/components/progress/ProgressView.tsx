import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/media";
import { revealInFolder } from "@/lib/api";
import { TASK_METAS } from "@/lib/tasks";

/** 运行进度 + 完成结果。 */
export function ProgressView() {
  const phase = useStore((s) => s.phase);
  const percent = useStore((s) => s.percent);
  const speed = useStore((s) => s.speed);
  const result = useStore((s) => s.result);
  const taskType = useStore((s) => s.taskType);
  const taskLabel =
    TASK_METAS.find((t) => t.type === taskType)?.label ?? "处理";
  const media = useStore((s) => s.media);
  const cancel = useStore((s) => s.cancel);
  const reset = useStore((s) => s.reset);

  if (phase === "running") {
    return (
      <div className="flex flex-col gap-4 rounded-card bg-surface-raised p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">正在{taskLabel}…</span>
          <span className="font-mono text-sm text-accent">
            {percent.toFixed(0)}%
            {speed && <span className="ml-2 text-ink-faint">{speed}</span>}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${Math.max(2, percent)}%` }}
          />
        </div>
        <Button variant="danger" onClick={cancel} className="self-start">
          取消
        </Button>
      </div>
    );
  }

  if (phase === "done" && result) {
    const before = media?.sizeBytes ?? 0;
    const after = result.outputSizeBytes ?? 0;
    const saved = before > 0 && after > 0 ? 1 - after / before : 0;
    return (
      <div className="flex flex-col gap-4 rounded-card border border-ok/20 bg-ok/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ok/15 text-2xl">
            ✓
          </div>
          <div>
            <p className="text-base font-semibold text-ink">{taskLabel}完成</p>
            <p className="text-sm text-ink-muted">
              {formatBytes(before)} → {formatBytes(after)}
              {saved > 0 && (
                <span className="ml-2 text-ok">
                  省了 {(saved * 100).toFixed(0)}%
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => result.outputPath && revealInFolder(result.outputPath)}
          >
            打开所在文件夹
          </Button>
          <Button variant="ghost" onClick={reset}>
            再做一个
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
