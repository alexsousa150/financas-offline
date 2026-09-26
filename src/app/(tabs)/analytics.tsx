import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { AnalyticsScreen as OriginalAnalyticsScreen } from '../../screens/AnalyticsScreen';

export default function AnalyticsRoute() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OriginalAnalyticsScreen />
    </View>
  );
}
