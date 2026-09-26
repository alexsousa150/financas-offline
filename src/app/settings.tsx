import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SettingsScreen as OriginalSettingsScreen } from '../screens/SettingsScreen';

export default function SettingsRoute() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OriginalSettingsScreen />
    </View>
  );
}
