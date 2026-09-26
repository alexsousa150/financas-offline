import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { AnalyticsScreen as OriginalAnalyticsScreen } from '../../screens/AnalyticsScreen';

export default function AnalyticsRoute() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <OriginalAnalyticsScreen />
    </View>
  );
}
