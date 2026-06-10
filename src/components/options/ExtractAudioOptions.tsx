import { useStore } from "@/store/useStore";
import { Segmented } from "@/components/ui/Segmented";

/** 提取音频任务的选项:格式 + 码率 */
export function ExtractAudioOptions() {
  const spec = useStore((s) => s.spec);
  const updateSpec = useStore((s) => s.updateSpec);
  if (spec.type !== "extractAudio") return null;

  const isWav = spec.format === "wav";

  return (
    <div className="flex flex-col gap-5">
      <Segmented<string>
        label="音频格式"
        value={spec.format}
        onChange={(format) => updateSpec({ format })}
        options={[
          { value: "mp3", label: "MP3", hint: "最通用" },
          { value: "aac", label: "AAC", hint: "高效" },
          { value: "wav", label: "WAV", hint: "无损" },
        ]}
      />
      {!isWav && (
        <Segmented<string>
          label="音质(码率)"
          value={spec.bitrate}
          onChange={(bitrate) => updateSpec({ bitrate })}
          options={[
            { value: "128k", label: "标准", hint: "128k" },
            { value: "192k", label: "较好", hint: "192k" },
            { value: "320k", label: "最佳", hint: "320k" },
          ]}
        />
      )}
      {isWav && (
        <p className="text-[11px] text-ink-faint">WAV 为无损格式,无需设置码率。</p>
      )}
    </div>
  );
}
