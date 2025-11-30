import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#5B8DEF',
  gray: '#C2C2C2',
  text: '#0F172A',
  textSecondary: '#64748B',
  background: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#f2f2f2',
  error: '#FF5A5A',
  disabled: '#A3AAB8',
};

export const fonts = {
  bold: 'Pretendard-Bold',
  semiBold: 'Pretendard-SemiBold',
  medium: 'Pretendard-Medium',
  regular: 'Pretendard-Regular',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
});

// 공통 헤더 옵션
export const commonHeaderOptions = {
  headerShadowVisible: false,
  headerTitleAlign: 'center' as const,
  headerStyle: { borderBottomWidth: 2, borderBottomColor: colors.borderLight },
};
