import { create } from "zustand";

type FooterConfig = {
  label: string;
  onPress: () => void;
  progress: number; // 0 ~ 1
};

type FooterState = FooterConfig & {
  setFooter: (config: Partial<FooterConfig>) => void;
};

export const useOnboardingFooter = create<FooterState>((set) => ({
  label: "다음",
  onPress: () => {},
  progress: 0,
  setFooter: (config) => set((s) => ({ ...s, ...config })),
}));
