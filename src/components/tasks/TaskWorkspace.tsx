import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/Button";
import { TaskSelector } from "@/components/tasks/TaskSelector";
import { OptionsPanel } from "@/components/options/OptionsPanel";
import { ConvertOptions } from "@/components/options/ConvertOptions";
import { ExtractAudioOptions } from "@/components/options/ExtractAudioOptions";
import { TrimOptions } from "@/components/options/TrimOptions";
import { ToGifOptions } from "@/components/options/ToGifOptions";
import { ExpertDrawer } from "@/components/options/ExpertDrawer";
import { PresetBar } from "@/components/options/PresetBar";

/** 当前任务类型对应的选项面板 */
function ActiveOptions() {
  const taskType = useStore((s) => s.taskType);
  switch (taskType) {
    case "compress":
      return <OptionsPanel />;
    case "convert":
      return <ConvertOptions />;
    case "extractAudio":
      return <ExtractAudioOptions />;
    case "trim":
      return <TrimOptions />;
    case "toGif":
      return <ToGifOptions />;
  }
}

/**
 * 任务工作区:任务选择器 + 当前任务的选项面板 + 专家抽屉 + 执行按钮。
 * 三层渐进式呈现在此承载:L1 选任务点按钮 / L2 选项面板 / L3 专家抽屉。
 */
export function TaskWorkspace() {
  const startTask = useStore((s) => s.startTask);
  const phase = useStore((s) => s.phase);

  const busy = phase === "running" || phase === "probing";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card bg-surface-raised p-5">
        <TaskSelector />
      </div>

      <div className="rounded-card bg-surface-raised p-5">
        <PresetBar />
      </div>

      <div className="rounded-card bg-surface-raised p-5">
        <ActiveOptions />
      </div>

      <ExpertDrawer />

      <Button size="lg" onClick={startTask} disabled={busy} className="w-full">
        开始处理
      </Button>
    </div>
  );
}
