import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";

export enum SubmitKey {
  Enter = "Enter",
  CtrlEnter = "Ctrl + Enter",
  ShiftEnter = "Shift + Enter",
  AltEnter = "Alt + Enter",
  MetaEnter = "Meta + Enter",
}

export enum Theme {
  Auto = "auto",
  Dark = "dark",
  Light = "light",
}

export const DEFAULT_CONFIG = {
  submitKey: SubmitKey.CtrlEnter as SubmitKey,
  avatar: "1f603",
  fontSize: 14,
  theme: Theme.Auto as Theme,
  tightBorder: true,
  sendPreviewBubble: true,
  sidebarWidth: 270,

  disablePromptHint: false,

  dontShowMaskSplashScreen: false, // dont show splash screen when create chat

  modelConfig: {
    model: "cwRong",
    temperature: 0.3,
    max_tokens: 1024,
    presence_penalty: 1.05,
    sendMemory: true,
    historyMessageCount: 6,
    compressMessageLengthThreshold: 1000,
    top_p: 0.95,
    top_k: 50,
    do_sample: true,
    truncate: 1000,
    max_new_tokens: 1024,
  },
};

export type ChatConfig = typeof DEFAULT_CONFIG;

export type ChatConfigStore = ChatConfig & {
  reset: () => void;
  update: (updater: (config: ChatConfig) => void) => void;
};

export type ModelConfig = ChatConfig["modelConfig"];

const ENABLE_GPT4 = true;

export const ALL_MODELS = [
  {
    name: "gpt-4",
    available: ENABLE_GPT4,
  },
  {
    name: "gpt-4-0314",
    available: ENABLE_GPT4,
  },
  {
    name: "gpt-4-32k",
    available: ENABLE_GPT4,
  },
  {
    name: "gpt-4-32k-0314",
    available: ENABLE_GPT4,
  },
  {
    name: "gpt-3.5-turbo",
    available: true,
  },
  {
    name: "gpt-3.5-turbo-0301",
    available: true,
  },
] as const;

// export type ModelType = (typeof ALL_MODELS)[number]["name"];

export function limitNumber(
  x: number,
  min: number,
  max: number,
  defaultValue: number,
) {
  if (typeof x !== "number" || isNaN(x)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, x));
}

export function limitModel(name: string) {
  return name;
  //   return ALL_MODELS.some((m) => m.name === name && m.available)
  //     ? name
  //     : ALL_MODELS[4].name;
}

export const ModalConfigValidator = {
  model(x: string) {
    return limitModel(x);
  },
  max_tokens(x: number) {
    return limitNumber(x, 0, 32000, 2000);
  },
  presence_penalty(x: number) {
    return limitNumber(x, -2, 2, 0);
  },
  temperature(x: number) {
    return limitNumber(x, 0, 1, 1);
  },
};

export const useAppConfig = create<ChatConfigStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CONFIG,

      reset() {
        set(() => ({ ...DEFAULT_CONFIG }));
      },

      update(updater) {
        const config = { ...get() };
        updater(config);
        set(() => config);
      },
    }),
    {
      name: StoreKey.Config,
      version: 2,
      migrate(persistedState, version) {
        if (version === 2) return persistedState as any;

        const state = persistedState as ChatConfig;
        state.modelConfig.sendMemory = true;
        state.modelConfig.historyMessageCount = 4;
        state.modelConfig.compressMessageLengthThreshold = 1000;
        state.dontShowMaskSplashScreen = false;

        return state;
      },
    },
  ),
);
