import { useAuthStore } from "@/utils/authStore";
import { useOnboardingFooter } from "@/utils/onboardingFooterStore";
import { supabase } from "@/utils/supabase";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function OnboardingFourthScreen() {
  const { profileId } = useAuthStore();
  const setHasCompletedOnboarding = useAuthStore((state) => state.setHasCompletedOnboarding);

  const setFooter = useOnboardingFooter((s) => s.setFooter);

  useEffect(() => {
    setFooter({
      label: "확인했어요",
      progress: 1,
      onPress: async () => {
        await supabase
            .from("profiles")
            .update({ has_completed_onboarding: true })
            .eq("profile_id", profileId);
        
        setHasCompletedOnboarding(true);
      },
    });
  }, []);

  return (
    <View>
      <Text>
        오전 6시 전까지 어쩌구
      </Text>
    </View>
  );
}