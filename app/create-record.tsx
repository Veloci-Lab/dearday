import { commonStyles } from '@/styles/common';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateRecordScreen() {
  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        <Text>기록 만들기</Text>
      </View>
    </SafeAreaView>
  );
}
