import { useState } from "react";
import { useStore } from "@/store/useStore";

/**
 * 预设栏:显示已保存的预设(点击应用、悬停可删),并支持把当前设置存为新预设。
 * 让"调好一次,下次一键复用"成为可能。
 */
export function PresetBar() {
  const presets = useStore((s) => s.presets);
  const applyPreset = useStore((s) => s.applyPreset);
  const removePreset = useStore((s) => s.removePreset);
  const saveCurrentAsPreset = useStore((s) => s.saveCurrentAsPreset);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  async function confirmSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveCurrentAsPreset(trimmed);
    setName("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-muted">我的预设</span>
      <div className="flex flex-wrap items-center gap-2">
        {presets.length === 0 && !adding && (
          <span className="text-xs text-ink-faint">
            还没有预设。调好设置后可存起来下次一键复用。
          </span>
        )}

        {presets.map((p) => (
          <span
            key={p.id}
            className="group flex items-center gap-1.5 rounded-lg bg-surface-overlay py-1.5 pl-3 pr-1.5 text-sm transition-colors hover:bg-white/10"
          >
            <button
              onClick={() => applyPreset(p.id)}
              className="font-medium text-ink hover:text-accent"
              title="应用此预设"
            >
              {p.name}
            </button>
            <button
              onClick={() => removePreset(p.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-ink-faint opacity-0 transition-opacity hover:bg-danger/20 hover:text-danger group-hover:opacity-100"
              title="删除"
              aria-label={`删除预设 ${p.name}`}
            >
              ×
            </button>
          </span>
        ))}

        {adding ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmSave();
                if (e.key === "Escape") {
                  setAdding(false);
                  setName("");
                }
              }}
              placeholder="预设名称"
              className="w-28 rounded-lg border border-accent bg-surface-overlay px-2 py-1.5 text-sm text-ink outline-none"
            />
            <button
              onClick={confirmSave}
              className="rounded-lg bg-accent px-2 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              存
            </button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg border border-dashed border-white/15 px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent/50 hover:text-ink"
          >
            + 存为预设
          </button>
        )}
      </div>
    </div>
  );
}
