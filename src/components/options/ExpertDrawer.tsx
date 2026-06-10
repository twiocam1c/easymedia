import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { previewCommand } from "@/lib/api";
import { deriveOutputPath } from "@/lib/tasks";

/**
 * L3 专家层:实时显示将执行的 FFmpeg 命令(所有任务通用)。
 * 对压缩任务额外暴露真实参数编辑(编码器/CRF/码率/速度)。
 */
export function ExpertDrawer() {
  const [open, setOpen] = useState(false);
  const spec = useStore((s) => s.spec);
  const media = useStore((s) => s.media);
  const updateAdvanced = useStore((s) => s.updateAdvanced);
  const [command, setCommand] = useState<string>("");

  // 实时预览将执行的命令
  useEffect(() => {
    if (!open || !media) return;
    let cancelled = false;
    const outputPath = deriveOutputPath(media.path, spec);
    previewCommand(media, spec, outputPath)
      .then((args) => {
        if (!cancelled) setCommand(args.join(" "));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, media, spec]);

  // 仅压缩任务有 advanced 参数可编辑
  const adv = spec.type === "compress" ? spec.advanced : null;

  return (
    <div className="rounded-card border border-white/5 bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">⚙️</span> 专家选项
        </span>
        <span
          className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-white/5 px-4 py-4">
          {adv && (
            <>
              <p className="text-[11px] text-ink-faint">
                留空则由上面的画质档位自动推导。这里的设置优先级最高。
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="编码器">
                  <select
                    value={adv.videoCodec ?? ""}
                    onChange={(e) =>
                      updateAdvanced({ videoCodec: e.target.value || null })
                    }
                    className="expert-input"
                  >
                    <option value="">自动 (libx264)</option>
                    <option value="libx264">H.264 (libx264)</option>
                    <option value="libx265">H.265 (libx265)</option>
                    <option value="libvpx-vp9">VP9</option>
                  </select>
                </Field>

                <Field label="速度预设">
                  <select
                    value={adv.speedPreset ?? ""}
                    onChange={(e) =>
                      updateAdvanced({ speedPreset: e.target.value || null })
                    }
                    className="expert-input"
                  >
                    <option value="">自动 (medium)</option>
                    <option value="ultrafast">ultrafast</option>
                    <option value="fast">fast</option>
                    <option value="medium">medium</option>
                    <option value="slow">slow</option>
                    <option value="veryslow">veryslow</option>
                  </select>
                </Field>

                <Field label="CRF (0-51,越小越清晰)">
                  <input
                    type="number"
                    min={0}
                    max={51}
                    placeholder="自动"
                    value={adv.crf ?? ""}
                    onChange={(e) =>
                      updateAdvanced({
                        crf: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="expert-input"
                  />
                </Field>

                <Field label="视频码率 (覆盖 CRF)">
                  <input
                    type="text"
                    placeholder="如 2M / 留空"
                    value={adv.videoBitrate ?? ""}
                    onChange={(e) =>
                      updateAdvanced({ videoBitrate: e.target.value || null })
                    }
                    className="expert-input"
                  />
                </Field>
              </div>
            </>
          )}

          {/* 实时命令预览 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-muted">
              将执行的命令
            </span>
            <code className="block max-h-28 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-ok/90 select-text">
              {command || "…"}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] text-ink-faint">{label}</span>
      {children}
    </label>
  );
}
