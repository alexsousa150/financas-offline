import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { CategoriesRepository } from '../database/categoriesRepo';
import { TransactionsRepository } from '../database/transactionsRepo';
import { BackupRepository } from '../database/backupRepo';
import { ReconciliationService } from '../services/reconciliationService';
import { Categoria, Transacao, ResumoFinanceiro, RankingCategoria } from '../types';
import { getMesAnoAtualIso } from '../utils/formatters';

interface AppContextType {
  // Repositórios
  categoriesRepo: CategoriesRepository;
  transactionsRepo: TransactionsRepository;
  backupRepo: BackupRepository;
  reconciliationService: ReconciliationService;

  // Estado
  mesSelecionado: string; // YYYY-MM
  setMesSelecionado: (mesAno: string) => void;
  categorias: Categoria[];
  carregarCategorias: () => Promise<void>;
  
  // Resumos e dados do mês selecionado
  resumoMes: ResumoFinanceiro;
  rankingGastos: RankingCategoria[];
  transacoesRecentes: Transacao[];
  carregarDadosPainel: () => Promise<void>;

  // Ações de modal
  modalTransacaoAberto: boolean;
  transacaoParaEdicao: Transacao | null;
  transacaoParaDuplicacao: Transacao | null;
  abrirModalNovoLancamento: () => void;
  abrirModalEditarLancamento: (transacao: Transacao) => void;
  abrirModalDuplicarLancamento: (transacao: Transacao) => void;
  fecharModalTransacao: () => void;

  modalCategoriaAberto: boolean;
  categoriaParaEdicao: Categoria | null;
  abrirModalNovaCategoria: () => void;
  abrirModalEditarCategoria: (categoria: Categoria) => void;
  fecharModalCategoria: () => void;

  // Notificador de atualização
  notificarMudancaDados: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useSQLiteContext();

  const [categoriesRepo] = useState(() => new CategoriesRepository(db));
  const [transactionsRepo] = useState(() => new TransactionsRepository(db));
  const [backupRepo] = useState(() => new BackupRepository(db));
  const [reconciliationService] = useState(() => new ReconciliationService(transactionsRepo));

  const [mesSelecionado, setMesSelecionado] = useState<string>(getMesAnoAtualIso());
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [resumoMes, setResumoMes] = useState<ResumoFinanceiro>({ receitas: 0, despesas: 0, saldo: 0 });
  const [rankingGastos, setRankingGastos] = useState<RankingCategoria[]>([]);
  const [transacoesRecentes, setTransacoesRecentes] = useState<Transacao[]>([]);

  // Estados dos modais globais
  const [modalTransacaoAberto, setModalTransacaoAberto] = useState(false);
  const [transacaoParaEdicao, setTransacaoParaEdicao] = useState<Transacao | null>(null);
  const [transacaoParaDuplicacao, setTransacaoParaDuplicacao] = useState<Transacao | null>(null);

  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [categoriaParaEdicao, setCategoriaParaEdicao] = useState<Categoria | null>(null);

  const carregarCategorias = useCallback(async () => {
    try {
      const lista = await categoriesRepo.listarTodas();
      setCategorias(lista);
    } catch (e) {
      console.error('Erro ao carregar categorias:', e);
    }
  }, [categoriesRepo]);

  const carregarDadosPainel = useCallback(async () => {
    try {
      const [resumo, ranking, recentes] = await Promise.all([
        transactionsRepo.obterResumoMes(mesSelecionado),
        transactionsRepo.obterRankingCategorias(mesSelecionado, 'despesa'),
        transactionsRepo.listar({ mesAno: mesSelecionado, limite: 8 }),
      ]);
      setResumoMes(resumo);
      setRankingGastos(ranking);
      setTransacoesRecentes(recentes);
    } catch (e) {
      console.error('Erro ao carregar painel:', e);
    }
  }, [transactionsRepo, mesSelecionado]);

  const notificarMudancaDados = useCallback(async () => {
    await Promise.all([carregarCategorias(), carregarDadosPainel()]);
  }, [carregarCategorias, carregarDadosPainel]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  useEffect(() => {
    carregarDadosPainel();
  }, [carregarDadosPainel, mesSelecionado]);

  // Controles do modal de transação
  const abrirModalNovoLancamento = () => {
    setTransacaoParaEdicao(null);
    setTransacaoParaDuplicacao(null);
    setModalTransacaoAberto(true);
  };

  const abrirModalEditarLancamento = (transacao: Transacao) => {
    setTransacaoParaDuplicacao(null);
    setTransacaoParaEdicao(transacao);
    setModalTransacaoAberto(true);
  };

  const abrirModalDuplicarLancamento = (transacao: Transacao) => {
    setTransacaoParaEdicao(null);
    setTransacaoParaDuplicacao(transacao);
    setModalTransacaoAberto(true);
  };

  const fecharModalTransacao = () => {
    setModalTransacaoAberto(false);
    setTransacaoParaEdicao(null);
    setTransacaoParaDuplicacao(null);
  };

  // Controles do modal de categoria
  const abrirModalNovaCategoria = () => {
    setCategoriaParaEdicao(null);
    setModalCategoriaAberto(true);
  };

  const abrirModalEditarCategoria = (categoria: Categoria) => {
    setCategoriaParaEdicao(categoria);
    setModalCategoriaAberto(true);
  };

  const fecharModalCategoria = () => {
    setModalCategoriaAberto(false);
    setCategoriaParaEdicao(null);
  };

  return (
    <AppContext.Provider
      value={{
        categoriesRepo,
        transactionsRepo,
        backupRepo,
        reconciliationService,
        mesSelecionado,
        setMesSelecionado,
        categorias,
        carregarCategorias,
        resumoMes,
        rankingGastos,
        transacoesRecentes,
        carregarDadosPainel,
        modalTransacaoAberto,
        transacaoParaEdicao,
        transacaoParaDuplicacao,
        abrirModalNovoLancamento,
        abrirModalEditarLancamento,
        abrirModalDuplicarLancamento,
        fecharModalTransacao,
        modalCategoriaAberto,
        categoriaParaEdicao,
        abrirModalNovaCategoria,
        abrirModalEditarCategoria,
        fecharModalCategoria,
        notificarMudancaDados,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return context;
};
