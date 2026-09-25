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
  onExcluir?: (transacao: Transacao) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transacao,
  onEditar,
  onDuplicar,
  onExcluir,
}) => {
  const { theme } = useTheme();
  const isDespesa = transacao.tipo === 'despesa';
  const corValor = isDespesa ? theme.danger : theme.success;
  const sinal = isDespesa ? '-' : '+';

  const corCategoria = transacao.categoria_cor || '#868E96';
  const iconeCategoria = (transacao.categoria_icone as any) || 'pricetag-outline';

  const confirmarExclusao = () => {
    Alert.alert(
      'Excluir Lançamento',
      `Deseja realmente excluir "${transacao.descricao || transacao.categoria_nome}" no valor de ${formatarMoeda(transacao.valor)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => onExcluir && onExcluir(transacao),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onEditar && onEditar(transacao)}
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
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
            {transacao.conciliado === 1 && (
              <View style={[styles.badgeConciliado, { backgroundColor: theme.successLight }]}>
                <Ionicons name="checkmark-done" size={12} color={theme.success} />
                <Text style={[styles.textoBadge, { color: theme.success }]}>Conciliado</Text>
              </View>
            )}
            {transacao.origem === 'importado' && transacao.conciliado !== 1 && (
              <View style={[styles.badgeImportado, { backgroundColor: theme.warningLight }]}>
                <Text style={[styles.textoBadge, { color: theme.warning }]}>Extrato</Text>
              </View>
            )}
          </View>

          {Boolean(transacao.descricao) && (
            <Text style={[styles.descricao, { color: theme.textSecondary }]} numberOfLines={1}>
              {transacao.descricao}
            </Text>
          )}

          <Text style={[styles.data, { color: theme.textMuted }]}>
            {formatarDataBr(transacao.data)}
          </Text>
        </View>
      </View>

      <View style={styles.direita}>
        <Text style={[styles.valor, { color: corValor }]}>
          {sinal} {formatarMoeda(transacao.valor)}
        </Text>

        <View style={styles.acoes}>
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
    gap: 6,
    flexWrap: 'wrap',
  },
  categoria: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeConciliado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgeImportado: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  textoBadge: {
    fontSize: 10,
    fontWeight: '700',
  },
  descricao: {
    fontSize: 13,
    marginTop: 2,
  },
  data: {
    fontSize: 11,
    marginTop: 3,
  },
  direita: {
    alignItems: 'flex-end',
  },
  valor: {
    fontSize: 15,
    fontWeight: '800',
  },
  acoes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
