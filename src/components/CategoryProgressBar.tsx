import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RankingCategoria } from '../types';
import { formatarMoeda, formatarVariacao } from '../utils/formatters';

interface CategoryProgressBarProps {
  item: RankingCategoria;
  isMaiorGasto?: boolean;
}

export const CategoryProgressBar: React.FC<CategoryProgressBarProps> = ({ item, isMaiorGasto = false }) => {
  const { theme } = useTheme();
  const variacao = formatarVariacao(item.variacaoPercentual);

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.linhaCabecalho}>
        <View style={styles.infoEsquerda}>
          <View style={[styles.circuloIcone, { backgroundColor: item.cor + '22' }]}>
            <Ionicons name={(item.icone as any) || 'pricetag-outline'} size={18} color={item.cor} />
          </View>
          <View style={styles.textos}>
            <View style={styles.linhaNome}>
              <Text style={[styles.nomeCategoria, { color: theme.text }]}>
                {item.nome}
              </Text>
              {isMaiorGasto && (
                <View style={[styles.badgeSangria, { backgroundColor: theme.dangerLight }]}>
                  <Text style={[styles.textoBadgeSangria, { color: theme.danger }]}>
                    Sangria #1
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtexto, { color: theme.textSecondary }]}>
              {item.percentual.toFixed(1)}% dos gastos do mês
            </Text>
          </View>
        </View>

        <View style={styles.infoDireita}>
          <Text style={[styles.valor, { color: theme.text }]}>
            {formatarMoeda(item.total)}
          </Text>

          {item.variacaoPercentual !== undefined && item.variacaoPercentual !== null && (
            <View style={styles.linhaVariacao}>
              <Ionicons
                name={
                  variacao.tipo === 'aumento'
                    ? 'trending-up'
                    : variacao.tipo === 'queda'
                    ? 'trending-down'
                    : 'remove'
                }
                size={14}
                color={
                  variacao.tipo === 'aumento'
                    ? theme.danger
                    : variacao.tipo === 'queda'
                    ? theme.success
                    : theme.textMuted
                }
              />
              <Text
                style={[
                  styles.textoVariacao,
                  {
                    color:
                      variacao.tipo === 'aumento'
                        ? theme.danger
                        : variacao.tipo === 'queda'
                        ? theme.success
                        : theme.textMuted,
                  },
                ]}
              >
                {variacao.texto} vs mês ant.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Barra de progresso */}
      <View style={[styles.fundoBarra, { backgroundColor: theme.inputBg }]}>
        <View
          style={[
            styles.preenchimentoBarra,
            {
              backgroundColor: item.cor,
              width: `${Math.min(Math.max(item.percentual, 2), 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  linhaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  circuloIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textos: {
    flex: 1,
  },
  linhaNome: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  nomeCategoria: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeSangria: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  textoBadgeSangria: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtexto: {
    fontSize: 12,
    marginTop: 2,
  },
  infoDireita: {
    alignItems: 'flex-end',
  },
  valor: {
    fontSize: 15,
    fontWeight: '800',
  },
  linhaVariacao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 2,
  },
  textoVariacao: {
    fontSize: 11,
    fontWeight: '600',
  },
  fundoBarra: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  preenchimentoBarra: {
    height: '100%',
    borderRadius: 4,
  },
});
