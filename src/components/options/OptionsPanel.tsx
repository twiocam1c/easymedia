import { useStore } from "@/store/useStore";
import { Segmented } from "@/components/ui/Segmented";
import type { CompressSpec, QualityPreset, ResolutionPreset } from "@/lib/types";

/**
 * L2 智能选项(压缩任务):用人话给选择,不暴露参数。
 * 想调一下的人点开这里;不碰的话 L1 默认值已经够用。
 */
export function OptionsPanel() {
  const spec = useStore((s) => s.spec);
  const updateSpec = useStore((s) => s.updateSpec);

  // 仅压缩任务使用本面板
  if (spec.type !== "compress") return null;
  const compress: CompressSpec = spec;
  const sizeActive = compress.targetSizeMB !== null;

  return (
    <div className="flex flex-col gap-5">
      <Segmented<QualityPreset>
        label="画质"
        value={compress.quality}
        onChange={(quality) => updateSpec({ quality })}
        options={[
          { value: "small", label: "够用就好", hint: "体积最小" },
          { value: "balanced", label: "清晰", hint: "推荐" },
          { value: "high", label: "接近原画", hint: "体积较大" },
        ]}
      />

      <Segmented<ResolutionPreset>
        label="分辨率"
        value={compress.resolution}
        onChange={(resolution) => updateSpec({ resolution })}
        options={[
          { value: "original", label: "原始" },
          { value: "1080p", label: "1080p" },
          { value: "720p", label: "720p" },
          { value: "480p", label: "480p" },
        ]}
      />

      {/* 目标大小:开启后按大小反推码率,适合"必须发出去"的场景 */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-muted">
          指定目标大小(可选)
        </span>
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface p-1">
          <SizeChip label="不限" active={!sizeActive} onClick={() => updateSpec({ targetSizeMB: null })} />
          {[10, 25, 50, 100].map((mb) => (
            <SizeChip
              key={mb}
              label={`${mb}MB`}
              active={sizeActive && compress.targetSizeMB === mb}
              onClick={() => updateSpec({ targetSizeMB: mb })}
            />
          ))}
        </div>
        {sizeActive && (
          <p className="text-[11px] text-ink-faint">
            将自动计算码率,使成片尽量贴近 {compress.targetSizeMB}MB。
          </p>
        )}
      </div>
    </div>
  );
}

function SizeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out-expo",
        active
          ? "bg-accent text-white shadow-lg shadow-accent/20"
          : "text-ink-muted hover:bg-surface-overlay hover:text-ink",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
