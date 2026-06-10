import { useStore } from "@/store/useStore";
import { TASK_METAS } from "@/lib/tasks";

/**
 * 任务选择器:横排任务卡,点击切换当前要做的事。
 * 体现"以任务为入口"的设计——用户先选想做什么,再调细节。
 */
export function TaskSelector() {
  const taskType = useStore((s) => s.taskType);
  const setTaskType = useStore((s) => s.setTaskType);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-ink-muted">我想做什么</span>
      <div className="grid grid-cols-5 gap-2">
        {TASK_METAS.map((t) => {
          const active = t.type === taskType;
          return (
            <button
              key={t.type}
              onClick={() => setTaskType(t.type)}
              className={[
                "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition-all duration-200 ease-out-expo",
                active
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "bg-surface-overlay text-ink-muted hover:bg-white/10 hover:text-ink",
              ].join(" ")}
              title={t.hint}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
