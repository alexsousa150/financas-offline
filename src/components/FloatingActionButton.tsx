import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface FloatingActionButtonProps {
  onPress: () => void;
  rotulo?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress, rotulo }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.fab,
        {
          backgroundColor: theme.primary,
          shadowColor: theme.primary,
        },
        rotulo ? styles.fabComRotulo : styles.fabCircular,
      ]}
      onPress={onPress}
    >
      <Ionicons name="add" size={24} color="#FFFFFF" />
      {rotulo && <Text style={styles.textoRotulo}>{rotulo}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 76,
    right: 18,
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabCircular: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  fabComRotulo: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  textoRotulo: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 4,
  },
});
