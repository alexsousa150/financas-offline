import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
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
      <Ionicons name="add" size={26} color="#FFFFFF" />
      {rotulo && <Text style={styles.textoRotulo}>{rotulo}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabCircular: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  fabComRotulo: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
  },
  textoRotulo: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 6,
  },
});
