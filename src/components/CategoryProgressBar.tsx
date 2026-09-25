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

  const temLimite = Boolean(item.limiteMensal && item.limiteMensal > 0);
  const percentualLimite = item.percentualLimite ?? 0;
  const restanteLimite = item.restanteLimite ?? 0;
  const isEstourado = temLimite && restanteLimite < 0;
  const isAlertaLimite = temLimite && percentualLimite >= 80 && !isEstourado;

  const corBarraLimite = isEstourado
    ? theme.danger
    : isAlertaLimite
    ? theme.warning
    : theme.success;

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
                size={13}
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

      {/* Informação e Barra do Limite / Teto de Gastos (se configurado) */}
      {temLimite ? (
        <View style={styles.secaoTeto}>
          <View style={styles.linhaInfoTeto}>
            <Text style={[styles.textoTeto, { color: theme.textSecondary }]}>
              Teto: {formatarMoeda(item.limiteMensal!)} ({percentualLimite.toFixed(0)}%)
            </Text>
            <Text
              style={[
                styles.textoRestanteTeto,
                { color: isEstourado ? theme.danger : isAlertaLimite ? theme.warning : theme.success },
              ]}
            >
              {isEstourado
                ? `Estourou em ${formatarMoeda(Math.abs(restanteLimite))}`
                : `Resta ${formatarMoeda(restanteLimite)}`}
            </Text>
          </View>

          {/* Barra de Limite */}
          <View style={[styles.fundoBarra, { backgroundColor: theme.inputBg }]}>
            <View
              style={[
                styles.preenchimentoBarra,
                {
                  backgroundColor: corBarraLimite,
                  width: `${Math.min(Math.max(percentualLimite, 3), 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      ) : (
        /* Barra de proporção geral da categoria */
        <View style={[styles.fundoBarra, { backgroundColor: theme.inputBg, marginTop: 4 }]}>
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
      )}
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
    marginBottom: 8,
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
  secaoTeto: {
    marginTop: 6,
  },
  linhaInfoTeto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  textoTeto: {
    fontSize: 11,
    fontWeight: '600',
  },
  textoRestanteTeto: {
    fontSize: 11,
    fontWeight: '700',
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
