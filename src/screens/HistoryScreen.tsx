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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { Transacao, TipoTransacao } from '../types';
import { TransactionItem } from '../components/TransactionItem';
import { MonthSelector } from '../components/MonthSelector';
import { formatarDataExtenso, formatarMoeda } from '../utils/formatters';

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
  const [tipoFiltro, setTipoFiltro] = useState<TipoTransacao | 'todos'>('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pagos' | 'pendentes'>('todos');
  const [categoriaFiltroId, setCategoriaFiltroId] = useState<number | 'todas'>('todas');
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregarTransacoes = useCallback(async () => {
    try {
      setCarregando(true);
      const lista = await transactionsRepo.listar({
        mesAno: mesSelecionado,
        tipo: tipoFiltro === 'todos' ? undefined : tipoFiltro,
        pago: statusFiltro === 'todos' ? undefined : statusFiltro === 'pagos' ? 1 : 0,
        categoriaId: categoriaFiltroId === 'todas' ? undefined : categoriaFiltroId,
        busca: busca.trim() || undefined,
      });
      setTransacoes(lista);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      setCarregando(false);
    }
  }, [transactionsRepo, mesSelecionado, tipoFiltro, statusFiltro, categoriaFiltroId, busca]);

  useEffect(() => {
    carregarTransacoes();
  }, [carregarTransacoes]);

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
        item.totalDia += t.valor;
      } else {
        item.totalDia -= t.valor;
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
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={carregarTransacoes}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={[styles.containerVazio, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="file-tray-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.tituloVazio, { color: theme.text }]}>Nenhum lançamento encontrado</Text>
            <Text style={[styles.subtituloVazio, { color: theme.textSecondary }]}>
              Tente alterar os filtros ou adicione uma nova transação.
            </Text>
          </View>
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
                onAlternarPago={async (lancamento) => {
                  await alternarStatusPago(lancamento.id, lancamento.pago === 0 ? 1 : 0);
                  await carregarTransacoes();
                }}
                onExcluir={async (lancamento, excluirTodoGrupo) => {
                  await transactionsRepo.excluir(lancamento.id, excluirTodoGrupo);
                  await notificarMudancaDados();
                  await carregarTransacoes();
                }}
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
  containerVazio: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  tituloVazio: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  subtituloVazio: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});
