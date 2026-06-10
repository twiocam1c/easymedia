import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { listenProgress } from "@/lib/api";
import { Dropzone } from "@/components/dropzone/Dropzone";
import { MediaCard } from "@/components/tasks/MediaCard";
import { TaskWorkspace } from "@/components/tasks/TaskWorkspace";
import { ProgressView } from "@/components/progress/ProgressView";

/**
 * 应用外壳。按阶段切换内容:
 * idle/probing -> 拖拽区
 * ready         -> 文件信息 + 三层压缩面板
 * running/done  -> 文件信息 + 进度/结果
 */
export function App() {
  const phase = useStore((s) => s.phase);
  const media = useStore((s) => s.media);
  const errorMessage = useStore((s) => s.errorMessage);
  const applyProgress = useStore((s) => s.applyProgress);
  const reset = useStore((s) => s.reset);
  const loadPresets = useStore((s) => s.loadPresets);

  // 订阅后端进度事件 + 启动时加载预设
  useEffect(() => {
    const unlistenPromise = listenProgress((e) => {
      applyProgress(e.percent, e.speed);
    });
    loadPresets();
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [applyProgress, loadPresets]);

  const showDropzone = phase === "idle" || phase === "probing";
  const showPanel = phase === "ready" || phase === "error";
  const showProgress = phase === "running" || phase === "done";

  return (
    <div className="flex h-full flex-col bg-surface text-ink">
      <header className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-lg">
          🎬
        </div>
        <div>
          <h1 className="text-base font-semibold leading-none">EasyMedia</h1>
          <p className="mt-1 text-xs text-ink-muted">
            拖进来,点一下,搞定 — 由 FFmpeg 驱动
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 overflow-auto p-6">
        {showDropzone && (
          <div className="flex flex-1 items-center justify-center">
            {phase === "probing" ? (
              <p className="text-ink-muted">正在读取文件信息…</p>
            ) : (
              <Dropzone />
            )}
          </div>
        )}

        {media && !showDropzone && (
          <MediaCard media={media} onChangeFile={reset} />
        )}

        {showPanel && media && <TaskWorkspace />}

        {showProgress && <ProgressView />}

        {errorMessage && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            出错了:{errorMessage}
          </div>
        )}
      </main>
    </div>
  );
}
