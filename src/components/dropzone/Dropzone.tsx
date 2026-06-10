import { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "@/store/useStore";
import { detectMediaKind } from "@/lib/media";

/**
 * 拖拽区:把视频文件拖进来,或点击选择。
 * 使用 Tauri webview 的原生拖放事件(可拿到真实文件路径)。
 */
export function Dropzone() {
  const loadFile = useStore((s) => s.loadFile);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "over") {
          setHovering(true);
        } else if (event.payload.type === "drop") {
          setHovering(false);
          const path = event.payload.paths[0];
          if (path) handlePath(path);
        } else {
          setHovering(false);
        }
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePath(path: string) {
    const kind = detectMediaKind(path);
    if (kind === "unknown") {
      // 首版聚焦视频;非媒体文件给出温和提示而非静默
      alert("这看起来不是支持的媒体文件。先拖一个视频进来试试吧。");
      return;
    }
    loadFile(path);
  }

  async function pick() {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "视频",
          extensions: ["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v"],
        },
      ],
    });
    if (typeof selected === "string") handlePath(selected);
  }

  return (
    <button
      onClick={pick}
      className={[
        "group flex w-full max-w-2xl flex-col items-center gap-5 rounded-card border-2 border-dashed px-10 py-16 transition-all duration-300 ease-out-expo",
        hovering
          ? "border-accent bg-accent/10 scale-[1.01]"
          : "border-white/10 bg-surface-raised hover:border-accent/50 hover:bg-surface-overlay",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-20 w-20 items-center justify-center rounded-2xl text-4xl transition-transform duration-300 ease-out-expo",
          hovering ? "scale-110 bg-accent/20" : "bg-surface-overlay group-hover:scale-105",
        ].join(" ")}
      >
        🎬
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-ink">
          把视频拖到这里
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          或点击选择文件 · 支持 MP4 / MOV / MKV / AVI 等
        </p>
      </div>
    </button>
  );
}
