import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getNomeMesAno, getMesAnterior, getMesPosterior, getMesAnoAtualIso } from '../utils/formatters';

interface MonthSelectorProps {
  mesAno: string;
  onMesChange: (novoMesAno: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ mesAno, onMesChange }) => {
  const { theme } = useTheme();
  const mesAtual = getMesAnoAtualIso();
  const isMesAtual = mesAno === mesAtual;

  const anterior = () => onMesChange(getMesAnterior(mesAno));
  const proximo = () => onMesChange(getMesPosterior(mesAno));
  const resetarHoje = () => onMesChange(mesAtual);

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <TouchableOpacity
        onPress={anterior}
        style={[styles.botaoSeta, { backgroundColor: theme.inputBg }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={20} color={theme.text} />
      </TouchableOpacity>

      <TouchableOpacity onPress={resetarHoje} style={styles.centro}>
        <Text style={[styles.textoMes, { color: theme.text }]}>
          {getNomeMesAno(mesAno)}
        </Text>
        {!isMesAtual && (
          <Text style={[styles.tagMesAtual, { color: theme.primary }]}>
            Voltar para o mês atual
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={proximo}
        style={[styles.botaoSeta, { backgroundColor: theme.inputBg }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-forward" size={20} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  botaoSeta: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {
    alignItems: 'center',
  },
  textoMes: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  tagMesAtual: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
