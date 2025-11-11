import { commonStyles } from '@/styles/common';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrganizeScreen() {
  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        <Text style={commonStyles.title}>정리</Text>
        <Text style={commonStyles.subtitle}>카테고리별 기록 분류</Text>
      </View>
    </SafeAreaView>
  );
}
