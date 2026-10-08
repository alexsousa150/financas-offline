import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SettingsScreen as OriginalSettingsScreen } from '../../screens/SettingsScreen';

export default function SettingsTabRoute() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <OriginalSettingsScreen />
    </View>
  );
}
