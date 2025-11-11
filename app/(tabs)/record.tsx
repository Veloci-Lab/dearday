import { commonStyles } from '@/styles/common';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecordScreen() {
  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        <Text style={commonStyles.title}>기록</Text>
        <Text style={commonStyles.subtitle}>새로운 순간 기록하기</Text>
      </View>
    </SafeAreaView>
  );
}
