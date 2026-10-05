import { IoniconsName } from '../types';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateProps {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  subtitulo?: string;
}

const EmptyState = React.memo(({ icone, titulo, subtitulo }: EmptyStateProps) => {
  const { theme } = useTheme();

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.card, 
        borderColor: theme.cardBorder 
      }
    ]}>
      <Ionicons name={icone as IoniconsName} size={36} color={theme.textMuted} />
      <Text style={[styles.titulo, { color: theme.textSecondary }]}>
        {titulo}
      </Text>
      {subtitulo && (
        <Text style={[styles.subtitulo, { color: theme.textMuted }]}>
          {subtitulo}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
