import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { MonthSelector } from '../components/MonthSelector';
import { TransactionItem } from '../components/TransactionItem';
import { formatarMoeda } from '../utils/formatters';

interface HomeScreenProps {
  onNavegarParaHistorico: () => void;
  onNavegarParaAnalise: () => void;
  onNavegarParaImportacao: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavegarParaHistorico,
  onNavegarParaAnalise,
  onNavegarParaImportacao,
}) => {
  const { theme } = useTheme();
  const {
    mesSelecionado,
    setMesSelecionado,
    resumoMes,
    rankingGastos,
    transacoesRecentes,
    carregarDadosPainel,
    abrirModalEditarLancamento,
    abrirModalDuplicarLancamento,
    transactionsRepo,
    notificarMudancaDados,
  } = useApp();

  const [atualizando, setAtualizando] = React.useState(false);

  const onRefresh = async () => {
    setAtualizando(true);
    await carregarDadosPainel();
    setAtualizando(false);
  };

  const maiorSangria = rankingGastos.length > 0 ? rankingGastos[0] : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      {/* Seletor de Mês */}
      <MonthSelector mesAno={mesSelecionado} onMesChange={setMesSelecionado} />

      {/* Card Principal de Saldo do Mês */}
      <View style={[styles.cardSaldo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.topoCardSaldo}>
          <Text style={[styles.labelSaldo, { color: theme.textSecondary }]}>Saldo do Mês</Text>
          <View style={[styles.badgeOffline, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={13} color={theme.primary} />
            <Text style={[styles.textoOffline, { color: theme.primary }]}>100% Offline</Text>
          </View>
        </View>

        <Text
          style={[
            styles.valorSaldo,
            { color: resumoMes.saldo >= 0 ? theme.text : theme.danger },
          ]}
        >
          {formatarMoeda(resumoMes.saldo)}
        </Text>

        <View style={styles.divisor} />

        <View style={styles.linhaMetricas}>
          {/* Receitas */}
          <View style={styles.colunaMetrica}>
            <View style={styles.linhaIconeMetrica}>
              <View style={[styles.circuloMetrica, { backgroundColor: theme.successLight }]}>
                <Ionicons name="arrow-up" size={16} color={theme.success} />
              </View>
              <Text style={[styles.labelMetrica, { color: theme.textSecondary }]}>Receitas</Text>
            </View>
            <Text style={[styles.valorMetrica, { color: theme.success }]}>
              {formatarMoeda(resumoMes.receitas)}
            </Text>
          </View>

          {/* Despesas */}
          <View style={styles.colunaMetrica}>
            <View style={styles.linhaIconeMetrica}>
              <View style={[styles.circuloMetrica, { backgroundColor: theme.dangerLight }]}>
                <Ionicons name="arrow-down" size={16} color={theme.danger} />
              </View>
              <Text style={[styles.labelMetrica, { color: theme.textSecondary }]}>Despesas</Text>
            </View>
            <Text style={[styles.valorMetrica, { color: theme.danger }]}>
              {formatarMoeda(resumoMes.despesas)}
            </Text>
          </View>
        </View>
      </View>

      {/* Alerta de Sangria Financeira (Onde o dinheiro mais foi embora) */}
      {maiorSangria && maiorSangria.total > 0 && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onNavegarParaAnalise}
          style={[
            styles.alertaSangria,
            {
              backgroundColor: theme.card,
              borderColor: theme.danger,
            },
          ]}
        >
          <View style={[styles.iconeSangria, { backgroundColor: theme.dangerLight }]}>
            <Ionicons name="flame" size={24} color={theme.danger} />
          </View>
          <View style={styles.textosSangria}>
            <View style={styles.linhaTituloSangria}>
              <Text style={[styles.tituloSangria, { color: theme.danger }]}>
                Ponto de Sangria
              </Text>
              <Text style={[styles.percentualSangria, { color: theme.danger }]}>
                {maiorSangria.percentual.toFixed(0)}% das despesas
              </Text>
            </View>
            <Text style={[styles.descSangria, { color: theme.text }]}>
              <Text style={{ fontWeight: '800' }}>{maiorSangria.nome}</Text> já consumiu{' '}
              <Text style={{ fontWeight: '800' }}>{formatarMoeda(maiorSangria.total)}</Text> este mês.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      )}

      {/* Alerta de Teto de Gastos Ultrapassado */}
      {(() => {
        const estouradas = rankingGastos.filter(
          (c) =>
            c.limiteMensal &&
            c.limiteMensal > 0 &&
            c.restanteLimite !== null &&
            c.restanteLimite !== undefined &&
            c.restanteLimite < 0
        );
        if (estouradas.length === 0) return null;
        const primeira = estouradas[0];

        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onNavegarParaAnalise}
            style={[
              styles.alertaSangria,
              {
                backgroundColor: theme.card,
                borderColor: theme.warning,
              },
            ]}
          >
            <View style={[styles.iconeSangria, { backgroundColor: theme.warningLight }]}>
              <Ionicons name="alert-circle" size={24} color={theme.warning} />
            </View>
            <View style={styles.textosSangria}>
              <View style={styles.linhaTituloSangria}>
                <Text style={[styles.tituloSangria, { color: theme.warning }]}>
                  Teto de Gastos Estourado
                </Text>
                <Text style={[styles.percentualSangria, { color: theme.warning }]}>
                  {primeira.percentualLimite?.toFixed(0)}% do teto
                </Text>
              </View>
              <Text style={[styles.descSangria, { color: theme.text }]}>
                <Text style={{ fontWeight: '800' }}>{primeira.nome}</Text> estourou o limite em{' '}
                <Text style={{ fontWeight: '800', color: theme.danger }}>
                  {formatarMoeda(Math.abs(primeira.restanteLimite!))}
                </Text>.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        );
      })()}

      {/* Atalho Rápido para Extrato Bancário */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onNavegarParaImportacao}
        style={[styles.bannerExtrato, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      >
        <View style={[styles.iconeExtrato, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="document-text-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.textosExtrato}>
          <Text style={[styles.tituloExtrato, { color: theme.text }]}>
            Importar Extrato Bancário
          </Text>
          <Text style={[styles.subtituloExtrato, { color: theme.textSecondary }]}>
            Conferir gastos do banco (OFX ou CSV) e conciliar
          </Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={24} color={theme.primary} />
      </TouchableOpacity>

      {/* Lançamentos Recentes */}
      <View style={styles.secaoRecentes}>
        <View style={styles.cabecalhoSecao}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Lançamentos Recentes</Text>
          <TouchableOpacity onPress={onNavegarParaHistorico}>
            <Text style={[styles.linkVerTodos, { color: theme.primary }]}>Ver Histórico</Text>
          </TouchableOpacity>
        </View>

        {transacoesRecentes.length === 0 ? (
          <View style={[styles.containerVazio, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="receipt-outline" size={44} color={theme.textMuted} />
            <Text style={[styles.tituloVazio, { color: theme.text }]}>Nenhum lançamento no mês</Text>
            <Text style={[styles.subtituloVazio, { color: theme.textSecondary }]}>
              Toque no botão "+" abaixo para adicionar seu primeiro gasto ou receita.
            </Text>
          </View>
        ) : (
          transacoesRecentes.map((t) => (
            <TransactionItem
              key={t.id}
              transacao={t}
              onEditar={abrirModalEditarLancamento}
              onDuplicar={abrirModalDuplicarLancamento}
              onExcluir={async (item) => {
                await transactionsRepo.excluir(item.id);
                await notificarMudancaDados();
              }}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  cardSaldo: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
  },
  topoCardSaldo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelSaldo: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  textoOffline: {
    fontSize: 11,
    fontWeight: '700',
  },
  valorSaldo: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  divisor: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: 16,
  },
  linhaMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colunaMetrica: {
    flex: 1,
  },
  linhaIconeMetrica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  circuloMetrica: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelMetrica: {
    fontSize: 12,
    fontWeight: '600',
  },
  valorMetrica: {
    fontSize: 17,
    fontWeight: '800',
  },
  alertaSangria: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconeSangria: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textosSangria: {
    flex: 1,
  },
  linhaTituloSangria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tituloSangria: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  percentualSangria: {
    fontSize: 12,
    fontWeight: '700',
  },
  descSangria: {
    fontSize: 13,
  },
  bannerExtrato: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconeExtrato: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textosExtrato: {
    flex: 1,
  },
  tituloExtrato: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtituloExtrato: {
    fontSize: 12,
    marginTop: 2,
  },
  secaoRecentes: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tituloSecao: {
    fontSize: 17,
    fontWeight: '800',
  },
  linkVerTodos: {
    fontSize: 13,
    fontWeight: '700',
  },
  containerVazio: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloVazio: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  subtituloVazio: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
