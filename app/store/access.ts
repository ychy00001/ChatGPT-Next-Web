import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";
import { BOT_HELLO } from "./chat";

export interface AccessControlStore {
  token: string;
  gptBaseUrl: string;
  updateToken: (_: string) => void;
  isAuthorized: () => boolean;
}

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

export const useAccessStore = create<AccessControlStore>()(
  persist(
    (set, get) => ({
      token: "TFof5o2HCi89znJh2v",
      gptBaseUrl: "/api/",

      updateToken(token: string) {
        set(() => ({ token }));
      },
      isAuthorized() {
        // has token or has code or disabled access control
        return !!get().token;
      },
    }),
    {
      name: StoreKey.Access,
      version: 1,
    },
  ),
);
