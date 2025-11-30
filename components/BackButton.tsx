import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

export const BackButton = () => (
  <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
    <Feather name="chevron-left" size={24} color="#000" />
  </Pressable>
);
