import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { HistoryScreen as OriginalHistoryScreen } from '../../screens/HistoryScreen';
import { FloatingActionButton } from '../../components/FloatingActionButton';

export default function HistoryRoute() {
  const { abrirModalNovoLancamento } = useApp();
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OriginalHistoryScreen />
      <FloatingActionButton onPress={abrirModalNovoLancamento} rotulo="Novo" />
    </View>
  );
}
