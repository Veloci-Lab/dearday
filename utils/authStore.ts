import { supabase } from "@/utils/supabase";
import { create } from "zustand";

type AuthState = {
  isLoggedIn: boolean;
  hasCompletedOnboarding: boolean;
  profileId: string | null;
  logIn: () => Promise<void>;
  logOut: () => void;
  setHasCompletedOnboarding: (v: boolean) => void;
  pendingRedirectUrl: string | null;
  setPendingRedirectUrl: (v: string | null) => void;
  clearPendingRedirectUrl: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  hasCompletedOnboarding: false,
  profileId: null,
  pendingRedirectUrl: null,

  logIn: async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("profile_id, has_completed_onboarding")
        .eq("uid", session.user.id)
        .single();

      if (!profileError && profile) {
        set({
          isLoggedIn: true,
          hasCompletedOnboarding: profile.has_completed_onboarding ?? false,
          profileId: profile.profile_id,
        });
        return;
      }
    }

    // 세션이 없거나, 프로필 조회 실패한 경우
    set({
      isLoggedIn: false,
      hasCompletedOnboarding: false,
      profileId: null,
    });
  },

  logOut: () =>
    set({
      isLoggedIn: false,
      hasCompletedOnboarding: false,
      profileId: null,
    }),

  setHasCompletedOnboarding: (v) => set({ hasCompletedOnboarding: v }),
  setPendingRedirectUrl: (v) => set({ pendingRedirectUrl: v }),
  clearPendingRedirectUrl: () => set({ pendingRedirectUrl: null }),
}));
