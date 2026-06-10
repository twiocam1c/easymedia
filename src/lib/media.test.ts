import { describe, it, expect } from "vitest";
import { detectMediaKind, extOf, formatBytes, formatDuration } from "./media";

describe("extOf", () => {
  it("extracts lowercase extension", () => {
    expect(extOf("clip.MP4")).toBe("mp4");
  });
  it("returns empty string when no extension", () => {
    expect(extOf("README")).toBe("");
  });
  it("returns empty string for trailing dot", () => {
    expect(extOf("weird.")).toBe("");
  });
  it("handles multiple dots using the last segment", () => {
    expect(extOf("my.home.video.mkv")).toBe("mkv");
  });
});

describe("detectMediaKind", () => {
  it("detects video", () => {
    expect(detectMediaKind("a.mp4")).toBe("video");
    expect(detectMediaKind("a.MKV")).toBe("video");
  });
  it("detects audio", () => {
    expect(detectMediaKind("song.mp3")).toBe("audio");
  });
  it("detects image", () => {
    expect(detectMediaKind("photo.png")).toBe("image");
  });
  it("returns unknown for unrecognized", () => {
    expect(detectMediaKind("doc.pdf")).toBe("unknown");
    expect(detectMediaKind("noext")).toBe("unknown");
  });
});

describe("formatBytes", () => {
  it("formats zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
  it("formats bytes without decimals", () => {
    expect(formatBytes(512)).toBe("512 B");
  });
  it("formats megabytes with one decimal", () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
  it("drops decimal above 100", () => {
    expect(formatBytes(150 * 1024 * 1024)).toBe("150 MB");
  });
});

describe("formatDuration", () => {
  it("formats under an hour as m:ss", () => {
    expect(formatDuration(75)).toBe("1:15");
  });
  it("formats over an hour as h:mm:ss", () => {
    expect(formatDuration(3675)).toBe("1:01:15");
  });
  it("guards against invalid input", () => {
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(NaN)).toBe("0:00");
  });
});
