import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Transacao, TipoTransacao, FormaPagamento } from '../types';
import { TransactionItem } from '../components/TransactionItem';
import { MonthSelector } from '../components/MonthSelector';
import { formatarDataExtenso, formatarMoeda, somarMoeda, subtrairMoeda } from '../utils/formatters';
import EmptyState from '../components/EmptyState';

interface GrupoDia {
  data: string;
  transacoes: Transacao[];
  totalDia: number;
}

export const HistoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    mesSelecionado,
    setMesSelecionado,
    categorias,
    transactionsRepo,
    abrirModalEditarLancamento,
    abrirModalDuplicarLancamento,
    alternarStatusPago,
    notificarMudancaDados,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [buscaGlobal, setBuscaGlobal] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState<TipoTransacao | 'todos'>('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pagos' | 'pendentes'>('todos');
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState<FormaPagamento | 'todas'>('todas');
  const [categoriaFiltroId, setCategoriaFiltroId] = useState<number | 'todas'>('todas');
  const TAMANHO_PAGINA = 35;
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const carregarTransacoes = useCallback(async () => {
    try {
      setCarregando(true);
      setPagina(0);
      const lista = await transactionsRepo.listar({
        mesAno: buscaGlobal && busca.trim() ? undefined : mesSelecionado,
        tipo: tipoFiltro === 'todos' ? undefined : tipoFiltro,
        pago: statusFiltro === 'todos' ? undefined : statusFiltro === 'pagos' ? 1 : 0,
        categoriaId: categoriaFiltroId === 'todas' ? undefined : categoriaFiltroId,
        formaPagamento: formaPagamentoFiltro === 'todas' ? undefined : formaPagamentoFiltro,
        busca: busca.trim() || undefined,
        limite: TAMANHO_PAGINA,
        offset: 0,
      });
      setTransacoes(lista);
      setTemMais(lista.length === TAMANHO_PAGINA);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      setCarregando(false);
    }
  }, [transactionsRepo, mesSelecionado, tipoFiltro, statusFiltro, categoriaFiltroId, formaPagamentoFiltro, busca, buscaGlobal]);

  const carregarMaisTransacoes = async () => {
    if (!temMais || carregandoMais || carregando) return;

    try {
      setCarregandoMais(true);
      const proximoOffset = (pagina + 1) * TAMANHO_PAGINA;
      const novas = await transactionsRepo.listar({
        mesAno: buscaGlobal && busca.trim() ? undefined : mesSelecionado,
        tipo: tipoFiltro === 'todos' ? undefined : tipoFiltro,
        pago: statusFiltro === 'todos' ? undefined : statusFiltro === 'pagos' ? 1 : 0,
        categoriaId: categoriaFiltroId === 'todas' ? undefined : categoriaFiltroId,
        formaPagamento: formaPagamentoFiltro === 'todas' ? undefined : formaPagamentoFiltro,
        busca: busca.trim() || undefined,
        limite: TAMANHO_PAGINA,
        offset: proximoOffset,
      });

      if (novas.length > 0) {
        setTransacoes((prev) => [...prev, ...novas]);
        setPagina((p) => p + 1);
      }
      setTemMais(novas.length === TAMANHO_PAGINA);
    } catch (e) {
      console.error('Erro ao carregar mais transações:', e);
    } finally {
      setCarregandoMais(false);
    }
  };

  useEffect(() => {
    carregarTransacoes();
  }, [carregarTransacoes]);

  const handleAlternarPago = useCallback(async (lancamento: Transacao) => {
    await alternarStatusPago(lancamento.id, lancamento.pago === 0 ? 1 : 0);
    await carregarTransacoes();
  }, [alternarStatusPago, carregarTransacoes]);

  const handleExcluir = useCallback(async (lancamento: Transacao, excluirTodoGrupo?: boolean) => {
    await transactionsRepo.excluir(lancamento.id, excluirTodoGrupo);
    await notificarMudancaDados();
    await carregarTransacoes();
  }, [transactionsRepo, notificarMudancaDados, carregarTransacoes]);

  // Agrupamento por dia
  const gruposPorDia = useMemo(() => {
    const mapa = new Map<string, { transacoes: Transacao[]; totalDia: number }>();

    for (const t of transacoes) {
      const chave = t.data;
      if (!mapa.has(chave)) {
        mapa.set(chave, { transacoes: [], totalDia: 0 });
      }
      const item = mapa.get(chave)!;
      item.transacoes.push(t);
      if (t.tipo === 'receita') {
        item.totalDia = somarMoeda(item.totalDia, t.valor);
      } else {
        item.totalDia = subtrairMoeda(item.totalDia, t.valor);
      }
    }

    const grupos: GrupoDia[] = [];
    mapa.forEach((valor, data) => {
      grupos.push({
        data,
        transacoes: valor.transacoes,
        totalDia: valor.totalDia,
      });
    });

    return grupos;
  }, [transacoes]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Topo: Título da Tela */}
      <View style={styles.cabecalhoTopo}>
        <Text style={[styles.tituloTela, { color: theme.text }]}>Histórico</Text>
        <Text style={[styles.subtituloTela, { color: theme.textSecondary }]}>
          {transacoes.length} {transacoes.length === 1 ? 'lançamento no período' : 'lançamentos no período'}
        </Text>
      </View>

      {/* Seletor de Mês */}
      <MonthSelector mesAno={mesSelecionado} onMesChange={setMesSelecionado} />

      {/* Barra de Busca */}
      <View style={[styles.barraBusca, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.inputBusca, { color: theme.text }]}
          placeholder="Buscar por descrição ou categoria..."
          placeholderTextColor={theme.textMuted}
          value={busca}
          onChangeText={setBusca}
        />
        {Boolean(busca) && (
          <TouchableOpacity onPress={() => setBusca('')} style={styles.botaoLimparBusca}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Opções de Escopo de Busca (Apenas neste mês vs Todo o histórico) */}
      {Boolean(busca.trim()) && (
        <View style={styles.linhaBuscaGlobal}>
          <TouchableOpacity
            style={[
              styles.chipBuscaGlobal,
              {
                backgroundColor: !buscaGlobal ? theme.chipActiveBg : theme.inputBg,
                borderColor: !buscaGlobal ? theme.chipActiveBg : theme.inputBorder,
              },
            ]}
            onPress={() => setBuscaGlobal(false)}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={!buscaGlobal ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.textoBuscaGlobal,
                { color: !buscaGlobal ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Mês atual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chipBuscaGlobal,
              {
                backgroundColor: buscaGlobal ? theme.chipActiveBg : theme.inputBg,
                borderColor: buscaGlobal ? theme.chipActiveBg : theme.inputBorder,
              },
            ]}
            onPress={() => setBuscaGlobal(true)}
          >
            <Ionicons
              name="globe-outline"
              size={13}
              color={buscaGlobal ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.textoBuscaGlobal,
                { color: buscaGlobal ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Todo o histórico
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filtros em Linha Horizontal */}
      <View style={styles.containerFiltros}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollFiltros}
        >
          {/* Status (Todos / Pagos / Pendentes) */}
          <TouchableOpacity
            onPress={() => setStatusFiltro('todos')}
            style={[
              styles.chipFiltro,
              {
                backgroundColor: statusFiltro === 'todos' ? theme.chipActiveBg : theme.inputBg,
                borderColor: statusFiltro === 'todos' ? theme.chipActiveBg : theme.inputBorder,
              },
            ]}
          >
            <Text style={[styles.textoChipFiltro, { color: statusFiltro === 'todos' ? '#FFFFFF' : theme.text }]}>
              Todos Status
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStatusFiltro('pagos')}
            style={[
              styles.chipFiltro,
              {
                backgroundColor: statusFiltro === 'pagos' ? theme.success : theme.inputBg,
                borderColor: statusFiltro === 'pagos' ? theme.success : theme.inputBorder,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={14}
              color={statusFiltro === 'pagos' ? '#FFFFFF' : theme.success}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.textoChipFiltro, { color: statusFiltro === 'pagos' ? '#FFFFFF' : theme.text }]}>
              Pagos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStatusFiltro('pendentes')}
            style={[
              styles.chipFiltro,
              {
                backgroundColor: statusFiltro === 'pendentes' ? theme.warning : theme.inputBg,
                borderColor: statusFiltro === 'pendentes' ? theme.warning : theme.inputBorder,
              },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={statusFiltro === 'pendentes' ? '#FFFFFF' : theme.warning}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.textoChipFiltro, { color: statusFiltro === 'pendentes' ? '#FFFFFF' : theme.text }]}>
              Pendentes
            </Text>
          </TouchableOpacity>

          <View style={styles.divisorVertical} />

          {/* Filtro por Tipo */}
          <TouchableOpacity
            onPress={() => setTipoFiltro('todos')}
            style={[
              styles.chipFiltro,
              {
                backgroundColor: tipoFiltro === 'todos' ? theme.chipActiveBg : theme.inputBg,
                borderColor: tipoFiltro === 'todos' ? theme.chipActiveBg : theme.inputBorder,
              },
            ]}
          >
            <Text style={[styles.textoChipFiltro, { color: tipoFiltro === 'todos' ? '#FFFFFF' : theme.text }]}>
              Tipo: Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTipoFiltro('despesa')}
            style={[
              styles.chipFiltro,
              {
                backgroundColor: tipoFiltro === 'despesa' ? theme.danger : theme.inputBg,
                borderColor: tipoFiltro === 'despesa' ? theme.danger : theme.inputBorder,
              },
            ]}
          >
            <Text style={[styles.textoChipFiltro, { color: tipoFiltro === 'despesa' ? '#FFFFFF' : theme.text }]}>
              Despesas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTipoFiltro('receita')}
            style={[
              styles.chipFiltro,
              {
                backgroundColor: tipoFiltro === 'receita' ? theme.success : theme.inputBg,
                borderColor: tipoFiltro === 'receita' ? theme.success : theme.inputBorder,
              },
            ]}
          >
            <Text style={[styles.textoChipFiltro, { color: tipoFiltro === 'receita' ? '#FFFFFF' : theme.text }]}>
              Receitas
            </Text>
          </TouchableOpacity>

          {/* Separador de Forma de Pagamento */}
          <View style={styles.divisorVertical} />

          <TouchableOpacity
            onPress={() => setFormaPagamentoFiltro('todas')}
            style={[
              styles.chipFiltro,
              {
                backgroundColor: formaPagamentoFiltro === 'todas' ? theme.chipActiveBg : theme.inputBg,
                borderColor: formaPagamentoFiltro === 'todas' ? theme.chipActiveBg : theme.inputBorder,
              },
            ]}
          >
            <Text style={[styles.textoChipFiltro, { color: formaPagamentoFiltro === 'todas' ? '#FFFFFF' : theme.text }]}>
              Todos Meios
            </Text>
          </TouchableOpacity>

          {(['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'] as FormaPagamento[]).map((fp) => {
            const label = fp === 'pix' ? 'Pix' : fp === 'cartao_credito' ? 'Crédito' : fp === 'cartao_debito' ? 'Débito' : 'Dinheiro';
            const selecionado = formaPagamentoFiltro === fp;
            return (
              <TouchableOpacity
                key={fp}
                onPress={() => setFormaPagamentoFiltro(fp)}
                style={[
                  styles.chipFiltro,
                  {
                    backgroundColor: selecionado ? theme.primary : theme.inputBg,
                    borderColor: selecionado ? theme.primary : theme.inputBorder,
                  },
                ]}
              >
                <Text style={[styles.textoChipFiltro, { color: selecionado ? '#FFFFFF' : theme.text }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Separador de categoria */}
          <View style={styles.divisorVertical} />

          <TouchableOpacity
            onPress={() => setCategoriaFiltroId('todas')}
            style={[
              styles.chipFiltro,
              {
                backgroundColor: categoriaFiltroId === 'todas' ? theme.chipActiveBg : theme.inputBg,
                borderColor: categoriaFiltroId === 'todas' ? theme.chipActiveBg : theme.inputBorder,
              },
            ]}
          >
            <Text style={[styles.textoChipFiltro, { color: categoriaFiltroId === 'todas' ? '#FFFFFF' : theme.text }]}>
              Todas Categorias
            </Text>
          </TouchableOpacity>

          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategoriaFiltroId(cat.id)}
              style={[
                styles.chipFiltro,
                {
                  backgroundColor: categoriaFiltroId === cat.id ? cat.cor : theme.inputBg,
                  borderColor: categoriaFiltroId === cat.id ? cat.cor : theme.inputBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.textoChipFiltro,
                  { color: categoriaFiltroId === cat.id ? '#FFFFFF' : theme.text },
                ]}
              >
                {cat.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista Agrupada por Dia */}
      <FlatList
        data={gruposPorDia}
        keyExtractor={(item) => item.data}
        contentContainerStyle={styles.listaConteudo}
        showsVerticalScrollIndicator={false}
        onEndReached={carregarMaisTransacoes}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={carregarTransacoes}
            tintColor={theme.primary}
          />
        }
        ListFooterComponent={
          carregandoMais ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : !temMais && transacoes.length >= TAMANHO_PAGINA ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: theme.textMuted }}>
                Todos os lançamentos do período foram carregados
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icone="file-tray-outline"
            titulo="Nenhum lançamento encontrado"
            subtitulo="Tente alterar os filtros ou adicione uma nova transação."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.grupoDiaContainer}>
            <View style={styles.cabecalhoDia}>
              <Text style={[styles.dataDia, { color: theme.textSecondary }]}>
                {formatarDataExtenso(item.data)}
              </Text>
              <Text
                style={[
                  styles.totalDia,
                  { color: item.totalDia >= 0 ? theme.success : theme.danger },
                ]}
              >
                {item.totalDia >= 0 ? '+' : ''}
                {formatarMoeda(item.totalDia)}
              </Text>
            </View>

            {item.transacoes.map((t) => (
              <TransactionItem
                key={t.id}
                transacao={t}
                onEditar={abrirModalEditarLancamento}
                onDuplicar={abrirModalDuplicarLancamento}
                onAlternarPago={handleAlternarPago}
                onExcluir={handleExcluir}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cabecalhoTopo: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tituloTela: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtituloTela: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  barraBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  inputBusca: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 14,
  },
  botaoLimparBusca: {
    padding: 4,
  },
  linhaBuscaGlobal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  chipBuscaGlobal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  textoBuscaGlobal: {
    fontSize: 12,
    fontWeight: '700',
  },
  containerFiltros: {
    marginBottom: 8,
  },
  scrollFiltros: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chipFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoChipFiltro: {
    fontSize: 12,
    fontWeight: '700',
  },
  divisorVertical: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.25)',
    marginHorizontal: 2,
  },
  listaConteudo: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  grupoDiaContainer: {
    marginBottom: 16,
  },
  cabecalhoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 4,
  },
  dataDia: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalDia: {
    fontSize: 13,
    fontWeight: '800',
  },
});
