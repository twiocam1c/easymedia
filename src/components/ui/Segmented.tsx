interface Option<T> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 标签文字 */
  label?: string;
}

/**
 * 分段选择器:L2"人话选项"的主要控件。
 * 用人能懂的词给选项,而非暴露参数。
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-medium text-ink-muted">{label}</span>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1 rounded-xl bg-surface p-1"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-out-expo",
                active
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "text-ink-muted hover:bg-surface-overlay hover:text-ink",
              ].join(" ")}
            >
              <span className="font-medium">{opt.label}</span>
              {opt.hint && (
                <span
                  className={[
                    "text-[11px]",
                    active ? "text-white/70" : "text-ink-faint",
                  ].join(" ")}
                >
                  {opt.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
