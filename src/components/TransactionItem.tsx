import { IoniconsName } from '../types';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transacao } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { formatarMoeda, formatarDataBr } from '../utils/formatters';

interface TransactionItemProps {
  transacao: Transacao;
  onEditar?: (transacao: Transacao) => void;
  onDuplicar?: (transacao: Transacao) => void;
  onExcluir?: (transacao: Transacao, excluirTodoGrupo?: boolean) => void;
  onAlternarPago?: (transacao: Transacao) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = React.memo(({
  transacao,
  onEditar,
  onDuplicar,
  onExcluir,
  onAlternarPago,
}) => {
  const { theme } = useTheme();
  const { formatarValor } = useApp();
  const isDespesa = transacao.tipo === 'despesa';
  const corValor = isDespesa ? theme.danger : theme.success;
  const sinal = isDespesa ? '-' : '+';

  const corCategoria = transacao.categoria_cor || '#868E96';
  const iconeCategoria = (transacao.categoria_icone as IoniconsName) || 'pricetag-outline';

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

  const abrirAcoesRapidas = () => {
    Alert.alert(
      transacao.descricao || transacao.categoria_nome || 'Lançamento',
      `${sinal} ${formatarMoeda(transacao.valor)} • ${transacao.categoria_nome || ''}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Duplicar', onPress: () => onDuplicar && onDuplicar(transacao) },
        { text: 'Excluir', style: 'destructive', onPress: confirmarExclusao },
      ]
    );
  };

  let tituloPrincipal = transacao.descricao || transacao.categoria_nome || 'Sem descrição';
  if (isParcelado) {
    tituloPrincipal += ` (${transacao.parcela_atual}/${transacao.total_parcelas})`;
  }
  const subtitulo = transacao.descricao ? transacao.categoria_nome : null;

  return (
    <TouchableOpacity
      accessibilityLabel={`${tituloPrincipal}, ${sinal} ${formatarMoeda(transacao.valor)}, ${isPendente ? 'pendente' : 'pago'}`}
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={() => onEditar && onEditar(transacao)}
      onLongPress={abrirAcoesRapidas}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: isPendente ? (theme.isDark ? 'rgba(251, 191, 36, 0.4)' : '#FDE68A') : theme.cardBorder,
        },
      ]}
    >
      <View style={styles.esquerda}>
        <View style={[styles.iconeContainer, { backgroundColor: corCategoria + '1C' }]}>
          <Ionicons name={iconeCategoria} size={20} color={corCategoria} />
        </View>

        <View style={styles.detalhes}>
          <Text style={[styles.titulo, { color: theme.text }]} numberOfLines={1}>
            {tituloPrincipal}
          </Text>

          <View style={styles.linhaSubtitulo}>
            {subtitulo && (
              <Text style={[styles.subtitulo, { color: theme.textSecondary }]} numberOfLines={1}>
                {subtitulo} •{' '}
              </Text>
            )}
            <Text style={[styles.data, { color: theme.textMuted }]}>
              {formatarDataBr(transacao.data)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.direita}>
        <Text style={[styles.valor, { color: isPendente ? theme.warning : corValor }]}>
          {sinal} {formatarValor(transacao.valor)}
        </Text>

        {isPendente ? (
          <TouchableOpacity
            onPress={() => onAlternarPago && onAlternarPago(transacao)}
            style={[styles.badgePendente, { backgroundColor: theme.warningLight, borderColor: theme.warning }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="time-outline" size={11} color={theme.warning} />
            <Text style={[styles.textoBadge, { color: theme.warning, fontWeight: '700' }]}>Pendente</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => onAlternarPago && onAlternarPago(transacao)}
            style={[styles.badgePago, { backgroundColor: theme.successLight }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="checkmark-sharp" size={11} color={theme.success} />
            <Text style={[styles.textoBadge, { color: theme.success }]}>Pago</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

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
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  linhaSubtitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  subtitulo: {
    fontSize: 12,
    fontWeight: '500',
  },
  data: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgePendente: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  badgePago: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  textoBadge: {
    fontSize: 10,
    fontWeight: '700',
  },
  direita: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  valor: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
});

TransactionItem.displayName = 'TransactionItem';
