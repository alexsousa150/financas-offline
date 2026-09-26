import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ImportScreen as OriginalImportScreen } from '../../screens/ImportScreen';

export default function ImportRoute() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OriginalImportScreen />
    </View>
  );
}
