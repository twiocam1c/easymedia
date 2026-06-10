import { describe, it, expect } from "vitest";
import {
  deriveOutputPath,
  defaultCompressSpec,
  defaultSpecFor,
  defaultToGifSpec,
} from "./tasks";

describe("deriveOutputPath", () => {
  it("compress keeps mp4 with _compressed suffix (Windows)", () => {
    expect(deriveOutputPath("C:\\videos\\clip.mov", defaultCompressSpec())).toBe(
      "C:\\videos\\clip_compressed.mp4"
    );
  });
  it("extractAudio switches extension to chosen format", () => {
    const spec = defaultSpecFor("extractAudio", 0);
    expect(deriveOutputPath("/home/u/clip.mkv", spec)).toBe(
      "/home/u/clip_audio.mp3"
    );
  });
  it("toGif uses .gif with no suffix", () => {
    expect(deriveOutputPath("C:\\v\\movie.mp4", defaultToGifSpec(10))).toBe(
      "C:\\v\\movie.gif"
    );
  });
  it("convert uses target format as extension", () => {
    const spec = defaultSpecFor("convert", 0);
    expect(deriveOutputPath("a.avi", spec)).toBe("a_converted.mp4");
  });
  it("handles file without extension", () => {
    expect(deriveOutputPath("C:\\v\\movie", defaultCompressSpec())).toBe(
      "C:\\v\\movie_compressed.mp4"
    );
  });
});

describe("defaultSpecFor", () => {
  it("compress starts balanced with no overrides", () => {
    const spec = defaultCompressSpec();
    expect(spec.quality).toBe("balanced");
    expect(spec.targetSizeMB).toBeNull();
  });
  it("trim spans full duration by default", () => {
    const spec = defaultSpecFor("trim", 42);
    expect(spec).toMatchObject({ type: "trim", startSec: 0, endSec: 42 });
  });
  it("toGif caps default end at 5 seconds", () => {
    expect(defaultToGifSpec(30).endSec).toBe(5);
    expect(defaultToGifSpec(3).endSec).toBe(3);
  });
});
