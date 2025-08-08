import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="today" />
      <Tabs.Screen name="mypage" />
    </Tabs>
  )
}