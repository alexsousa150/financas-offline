import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CategoriesScreen as OriginalCategoriesScreen } from '../screens/CategoriesScreen';

export default function CategoriesRoute() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OriginalCategoriesScreen />
    </View>
  );
}
