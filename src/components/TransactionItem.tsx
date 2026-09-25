import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transacao } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatarMoeda, formatarDataBr } from '../utils/formatters';

interface TransactionItemProps {
  transacao: Transacao;
  onEditar?: (transacao: Transacao) => void;
  onDuplicar?: (transacao: Transacao) => void;
  onExcluir?: (transacao: Transacao, excluirTodoGrupo?: boolean) => void;
  onAlternarPago?: (transacao: Transacao) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transacao,
  onEditar,
  onDuplicar,
  onExcluir,
  onAlternarPago,
}) => {
  const { theme } = useTheme();
  const isDespesa = transacao.tipo === 'despesa';
  const corValor = isDespesa ? theme.danger : theme.success;
  const sinal = isDespesa ? '-' : '+';

  const corCategoria = transacao.categoria_cor || '#868E96';
  const iconeCategoria = (transacao.categoria_icone as any) || 'pricetag-outline';

  const isParcelado = Boolean(transacao.total_parcelas && transacao.total_parcelas > 1);
  const isPendente = transacao.pago === 0;

  const confirmarExclusao = () => {
    if (isParcelado && transacao.grupo_parcelamento_id) {
      Alert.alert(
        'Excluir Compra Parcelada',
        `Esta transação é a parcela ${transacao.parcela_atual}/${transacao.total_parcelas}. O que deseja excluir?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Apenas Esta Parcela',
            onPress: () => onExcluir && onExcluir(transacao, false),
          },
          {
            text: 'Todas as Parcelas',
            style: 'destructive',
            onPress: () => onExcluir && onExcluir(transacao, true),
          },
        ]
      );
    } else {
      Alert.alert(
        'Excluir Lançamento',
        `Deseja realmente excluir "${transacao.descricao || transacao.categoria_nome}" no valor de ${formatarMoeda(transacao.valor)}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => onExcluir && onExcluir(transacao, false),
          },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onEditar && onEditar(transacao)}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: isPendente ? theme.warning : theme.cardBorder,
          opacity: isPendente ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.esquerda}>
        <View style={[styles.iconeContainer, { backgroundColor: corCategoria + '22' }]}>
          <Ionicons name={iconeCategoria} size={20} color={corCategoria} />
        </View>

        <View style={styles.detalhes}>
          <View style={styles.linhaTitulo}>
            <Text style={[styles.categoria, { color: theme.text }]} numberOfLines={1}>
              {transacao.categoria_nome || 'Sem categoria'}
            </Text>

            {/* Badge de Parcelamento */}
            {isParcelado && (
              <View style={[styles.badgeParcela, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="card-outline" size={11} color={theme.primary} />
                <Text style={[styles.textoBadgeParcela, { color: theme.primary }]}>
                  {transacao.parcela_atual}/{transacao.total_parcelas}
                </Text>
              </View>
            )}

            {/* Badge de Pendente / Pago */}
            {isPendente ? (
              <TouchableOpacity
                onPress={() => onAlternarPago && onAlternarPago(transacao)}
                style={[styles.badgePendente, { backgroundColor: theme.warningLight, borderColor: theme.warning }]}
              >
                <Ionicons name="time-outline" size={11} color={theme.warning} />
                <Text style={[styles.textoBadge, { color: theme.warning, fontWeight: '700' }]}>Pendente</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.badgePago, { backgroundColor: theme.successLight }]}>
                <Ionicons name="checkmark-sharp" size={11} color={theme.success} />
                <Text style={[styles.textoBadge, { color: theme.success }]}>Pago</Text>
              </View>
            )}

            {transacao.conciliado === 1 && (
              <View style={[styles.badgeConciliado, { backgroundColor: theme.successLight }]}>
                <Ionicons name="checkmark-done" size={11} color={theme.success} />
                <Text style={[styles.textoBadge, { color: theme.success }]}>Conciliado</Text>
              </View>
            )}
          </View>

          {Boolean(transacao.descricao) && (
            <Text style={[styles.descricao, { color: theme.textSecondary }]} numberOfLines={1}>
              {transacao.descricao}
            </Text>
          )}

          <Text style={[styles.data, { color: isPendente ? theme.warning : theme.textMuted }]}>
            {isPendente ? '⏰ Vence em: ' : ''}{formatarDataBr(transacao.data)}
          </Text>
        </View>
      </View>

      <View style={styles.direita}>
        <Text style={[styles.valor, { color: isPendente ? theme.warning : corValor }]}>
          {sinal} {formatarMoeda(transacao.valor)}
        </Text>

        <View style={styles.acoes}>
          {onAlternarPago && (
            <TouchableOpacity
              onPress={() => onAlternarPago(transacao)}
              style={[
                styles.botaoAcao,
                { backgroundColor: isPendente ? theme.warningLight : theme.inputBg },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isPendente ? 'time' : 'checkmark-circle'}
                size={15}
                color={isPendente ? theme.warning : theme.success}
              />
            </TouchableOpacity>
          )}
          {onDuplicar && (
            <TouchableOpacity
              onPress={() => onDuplicar(transacao)}
              style={[styles.botaoAcao, { backgroundColor: theme.inputBg }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="copy-outline" size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          {onExcluir && (
            <TouchableOpacity
              onPress={confirmarExclusao}
              style={[styles.botaoAcao, { backgroundColor: theme.inputBg }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color={theme.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  esquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconeContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detalhes: {
    flex: 1,
  },
  linhaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  categoria: {
    fontSize: 14,
    fontWeight: '700',
  },
  badgeParcela: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  textoBadgeParcela: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgePendente: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  badgePago: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgeConciliado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  textoBadge: {
    fontSize: 10,
    fontWeight: '600',
  },
  descricao: {
    fontSize: 12,
    marginBottom: 2,
  },
  data: {
    fontSize: 11,
    fontWeight: '600',
  },
  direita: {
    alignItems: 'flex-end',
  },
  valor: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  acoes: {
    flexDirection: 'row',
    gap: 6,
  },
  botaoAcao: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
