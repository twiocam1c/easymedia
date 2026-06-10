import { create } from "zustand";
import type {
  CompressSpec,
  MediaInfo,
  SavedPreset,
  TaskResult,
  TaskSpec,
  TaskType,
} from "@/lib/types";
import { defaultSpecFor, makeTaskId, deriveOutputPath } from "@/lib/tasks";
import * as api from "@/lib/api";

type Phase = "idle" | "probing" | "ready" | "running" | "done" | "error";

interface AppState {
  phase: Phase;
  media: MediaInfo | null;
  taskType: TaskType;
  spec: TaskSpec;
  taskId: string | null;
  percent: number;
  speed: string | null;
  result: TaskResult | null;
  errorMessage: string | null;
  presets: SavedPreset[];

  loadFile: (path: string) => Promise<void>;
  setTaskType: (type: TaskType) => void;
  updateSpec: (patch: Partial<TaskSpec>) => void;
  updateAdvanced: (patch: Partial<CompressSpec["advanced"]>) => void;
  startTask: () => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
  applyProgress: (percent: number, speed: string | null) => void;
  loadPresets: () => Promise<void>;
  saveCurrentAsPreset: (name: string) => Promise<void>;
  applyPreset: (id: string) => void;
  removePreset: (id: string) => Promise<void>;
}

const DEFAULT_TYPE: TaskType = "compress";

export const useStore = create<AppState>((set, get) => ({
  phase: "idle",
  media: null,
  taskType: DEFAULT_TYPE,
  spec: defaultSpecFor(DEFAULT_TYPE, 0),
  taskId: null,
  percent: 0,
  speed: null,
  result: null,
  errorMessage: null,
  presets: [],

  async loadFile(path) {
    set({ phase: "probing", errorMessage: null, result: null });
    try {
      const media = await api.probeMedia(path);
      set({
        media,
        phase: "ready",
        taskType: DEFAULT_TYPE,
        spec: defaultSpecFor(DEFAULT_TYPE, media.durationSec),
      });
    } catch (e) {
      set({ phase: "error", errorMessage: String(e) });
    }
  },

  setTaskType(type) {
    const { media } = get();
    set({
      taskType: type,
      spec: defaultSpecFor(type, media?.durationSec ?? 0),
    });
  },

  updateSpec(patch) {
    // patch 与当前 spec 同类型,合并即可
    set({ spec: { ...get().spec, ...patch } as TaskSpec });
  },

  updateAdvanced(patch) {
    const spec = get().spec;
    if (spec.type !== "compress") return;
    set({ spec: { ...spec, advanced: { ...spec.advanced, ...patch } } });
  },

  async startTask() {
    const { media, spec } = get();
    if (!media) return;
    const taskId = makeTaskId();
    const outputPath = deriveOutputPath(media.path, spec);
    set({ phase: "running", taskId, percent: 0, speed: null, result: null });
    try {
      const result = await api.runTask(taskId, media, spec, outputPath);
      if (result.ok) {
        set({ phase: "done", result, percent: 100 });
      } else {
        set({ phase: "error", errorMessage: result.errorMessage });
      }
    } catch (e) {
      set({ phase: "error", errorMessage: String(e) });
    }
  },

  async cancel() {
    const { taskId } = get();
    if (taskId) {
      await api.cancelTask(taskId).catch(() => {});
    }
    set({ phase: "ready", taskId: null, percent: 0, speed: null });
  },

  reset() {
    set({
      phase: "idle",
      media: null,
      taskType: DEFAULT_TYPE,
      spec: defaultSpecFor(DEFAULT_TYPE, 0),
      taskId: null,
      percent: 0,
      speed: null,
      result: null,
      errorMessage: null,
    });
  },

  applyProgress(percent, speed) {
    if (get().phase === "running") {
      set({ percent, speed });
    }
  },

  async loadPresets() {
    try {
      const presets = await api.listPresets();
      set({ presets });
    } catch {
      // 预设加载失败不应阻断主流程
    }
  },

  async saveCurrentAsPreset(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset: SavedPreset = {
      id: makeTaskId(),
      name: trimmed,
      spec: get().spec,
    };
    const presets = await api.savePreset(preset);
    set({ presets });
  },

  applyPreset(id) {
    const preset = get().presets.find((p) => p.id === id);
    if (preset) {
      // 应用预设会切到它保存的任务类型
      set({
        taskType: preset.spec.type,
        spec: JSON.parse(JSON.stringify(preset.spec)) as TaskSpec,
      });
    }
  },

  async removePreset(id) {
    const presets = await api.deletePreset(id);
    set({ presets });
  },
}));
