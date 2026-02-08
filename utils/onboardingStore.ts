import { create } from "zustand";

interface OnboardingStore {
  nickname: string;
  avatarUri: string | null;

  setNickname: (nickname: string) => void;
  setAvatarUri: (uri: string | null) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  nickname: "",
  avatarUri: null,

  setNickname: (nickname) => set({ nickname }),
  setAvatarUri: (avatarUri) => set({ avatarUri }),
  reset: () => set({ nickname: "", avatarUri: null }),
}));