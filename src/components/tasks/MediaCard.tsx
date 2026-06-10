import type { MediaInfo } from "@/lib/types";
import { formatBytes, formatDuration } from "@/lib/media";
import { Button } from "@/components/ui/Button";

interface Props {
  media: MediaInfo;
  onChangeFile: () => void;
}

/** 已加载文件的信息条:文件名 + 关键元数据。 */
export function MediaCard({ media, onChangeFile }: Props) {
  const dims = media.width > 0 ? `${media.width}×${media.height}` : "音频";
  return (
    <div className="flex items-center gap-4 rounded-card bg-surface-raised p-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-2xl">
        🎞️
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink" title={media.fileName}>
          {media.fileName}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
          <span>{formatBytes(media.sizeBytes)}</span>
          <span className="text-ink-faint">·</span>
          <span>{formatDuration(media.durationSec)}</span>
          <span className="text-ink-faint">·</span>
          <span>{dims}</span>
          {media.videoCodec && (
            <>
              <span className="text-ink-faint">·</span>
              <span className="uppercase">{media.videoCodec}</span>
            </>
          )}
        </div>
      </div>
      <Button variant="ghost" size="md" onClick={onChangeFile}>
        换文件
      </Button>
    </div>
  );
}
