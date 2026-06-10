import { useStore } from "@/store/useStore";
import { Segmented } from "@/components/ui/Segmented";
import type { QualityPreset } from "@/lib/types";

/** 转格式任务的选项:目标格式 + 画质 */
export function ConvertOptions() {
  const spec = useStore((s) => s.spec);
  const updateSpec = useStore((s) => s.updateSpec);
  if (spec.type !== "convert") return null;

  return (
    <div className="flex flex-col gap-5">
      <Segmented<string>
        label="目标格式"
        value={spec.format}
        onChange={(format) => updateSpec({ format })}
        options={[
          { value: "mp4", label: "MP4", hint: "最通用" },
          { value: "mkv", label: "MKV", hint: "容纳广" },
          { value: "mov", label: "MOV", hint: "苹果" },
          { value: "webm", label: "WebM", hint: "网页" },
        ]}
      />
      <Segmented<QualityPreset>
        label="画质"
        value={spec.quality}
        onChange={(quality) => updateSpec({ quality })}
        options={[
          { value: "small", label: "够用就好", hint: "体积小" },
          { value: "balanced", label: "清晰", hint: "推荐" },
          { value: "high", label: "接近原画", hint: "体积大" },
        ]}
      />
    </div>
  );
}
