import { commonStyles } from '@/styles/common';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PhotoOrganize1Screen() {
  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        <Text>사진 정리하기 1</Text>
      </View>
    </SafeAreaView>
  );
}
