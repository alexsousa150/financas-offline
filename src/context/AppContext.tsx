import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { CategoriesRepository } from '../database/categoriesRepo';
import { TransactionsRepository } from '../database/transactionsRepo';
import { BackupRepository, StatusBackupInfo } from '../database/backupRepo';
import { SettingsRepository } from '../database/settingsRepo';
import { RecurringRepository } from '../database/recurringRepo';
import { FavoritesRepository } from '../database/favoritesRepo';
import { LearningRepository } from '../database/learningRepo';
import { ReconciliationService } from '../services/reconciliationService';
import { PdfReportService } from '../services/pdfReportService';
import {
  Categoria,
  Transacao,
  ResumoFinanceiro,
  RankingCategoria,
  TetoDiarioInfo,
  AnaliseEssencialVsEstilo,
  Favorito,
  TipoTransacao,
} from '../types';
import { getMesAnoAtualIso, formatarMoeda, getDataHojeIso } from '../utils/formatters';
import { AppHaptics } from '../utils/haptics';

interface AppContextType {
  // Repositórios
  categoriesRepo: CategoriesRepository;
  transactionsRepo: TransactionsRepository;
  backupRepo: BackupRepository;
  settingsRepo: SettingsRepository;
  recurringRepo: RecurringRepository;
  favoritesRepo: FavoritesRepository;
  learningRepo: LearningRepository;
  reconciliationService: ReconciliationService;

  // Estado do Mês
  mesSelecionado: string; // YYYY-MM
  setMesSelecionado: (mesAno: string) => void;
  categorias: Categoria[];
  carregarCategorias: () => Promise<void>;

  // Favoritos (Lançamento Rápido com 1 toque)
  favoritos: Favorito[];
  carregarFavoritos: () => Promise<void>;
  executarLancamentoFavorito: (favorito: Favorito) => Promise<void>;

  // Status e Aviso Periódico de Backup
  statusBackup: StatusBackupInfo;
  carregarStatusBackup: () => Promise<void>;

  // Relatório PDF
  exportarRelatorioPdfMes: (mesAno: string) => Promise<void>;

  // Resumos e dados do mês selecionado
  resumoMes: ResumoFinanceiro;
  rankingGastos: RankingCategoria[];
  transacoesRecentes: Transacao[];
  tetoDiario: TetoDiarioInfo | null;
  analiseEssencial: AnaliseEssencialVsEstilo | null;
  carregarDadosPainel: () => Promise<void>;
  alternarStatusPago: (id: number, novoStatus: number) => Promise<void>;

  // Modo Privacidade
  modoPrivacidade: boolean;
  alternarModoPrivacidade: () => void;
  formatarValor: (valor: number) => string;

  // Biometria
  biometriaHabilitada: boolean;
  setBiometriaHabilitada: (habilitar: boolean) => Promise<void>;
  autenticado: boolean;
  setAutenticado: (autenticado: boolean) => void;

  // Ações de modal
  modalTransacaoAberto: boolean;
  modalTransacaoTipoInicial: TipoTransacao;
  transacaoParaEdicao: Transacao | null;
  transacaoParaDuplicacao: Transacao | null;
  abrirModalNovoLancamento: (tipoInicial?: TipoTransacao) => void;
  abrirModalEditarLancamento: (transacao: Transacao) => void;
  abrirModalDuplicarLancamento: (transacao: Transacao) => void;
  fecharModalTransacao: () => void;

  modalCategoriaAberto: boolean;
  categoriaParaEdicao: Categoria | null;
  abrirModalNovaCategoria: () => void;
  abrirModalEditarCategoria: (categoria: Categoria) => void;
  fecharModalCategoria: () => void;

  modalRecorrentesAberto: boolean;
  abrirModalRecorrentes: () => void;
  fecharModalRecorrentes: () => void;

  // Notificador de atualização
  notificarMudancaDados: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useSQLiteContext();

  const [categoriesRepo] = useState(() => new CategoriesRepository(db));
  const [transactionsRepo] = useState(() => new TransactionsRepository(db));
  const [backupRepo] = useState(() => new BackupRepository(db));
  const [settingsRepo] = useState(() => new SettingsRepository(db));
  const [recurringRepo] = useState(() => new RecurringRepository(db));
  const [favoritesRepo] = useState(() => new FavoritesRepository(db));
  const [learningRepo] = useState(() => new LearningRepository(db));
  const [reconciliationService] = useState(() => new ReconciliationService(transactionsRepo, learningRepo));

  const [mesSelecionado, setMesSelecionado] = useState<string>(getMesAnoAtualIso());
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [statusBackup, setStatusBackup] = useState<StatusBackupInfo>({
    precisaBackup: false,
    diasSemBackup: null,
    novosLancamentos: 0,
    ultimoBackupEm: null,
  });

  const [resumoMes, setResumoMes] = useState<ResumoFinanceiro>({
    receitas: 0,
    despesas: 0,
    saldo: 0,
    saldoRealizado: 0,
    receitasRealizadas: 0,
    despesasRealizadas: 0,
    receitasPendentes: 0,
    despesasPendentes: 0,
    contasPendentesQtd: 0,
    contasPendentesValor: 0,
  });
  const [rankingGastos, setRankingGastos] = useState<RankingCategoria[]>([]);
  const [transacoesRecentes, setTransacoesRecentes] = useState<Transacao[]>([]);
  const [tetoDiario, setTetoDiario] = useState<TetoDiarioInfo | null>(null);
  const [analiseEssencial, setAnaliseEssencial] = useState<AnaliseEssencialVsEstilo | null>(null);

  // Privacidade e Biometria
  const [modoPrivacidade, setModoPrivacidade] = useState(false);
  const [biometriaHabilitada, setBiometriaHabilitadaState] = useState(false);
  const [autenticado, setAutenticado] = useState(true);

  // Estados dos modais globais
  const [modalTransacaoAberto, setModalTransacaoAberto] = useState(false);
  const [modalTransacaoTipoInicial, setModalTransacaoTipoInicial] = useState<TipoTransacao>('despesa');
  const [transacaoParaEdicao, setTransacaoParaEdicao] = useState<Transacao | null>(null);
  const [transacaoParaDuplicacao, setTransacaoParaDuplicacao] = useState<Transacao | null>(null);

  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [categoriaParaEdicao, setCategoriaParaEdicao] = useState<Categoria | null>(null);

  const [modalRecorrentesAberto, setModalRecorrentesAberto] = useState(false);

  // Carrega configurações iniciais (Privacidade e Biometria)
  useEffect(() => {
    (async () => {
      const priv = await settingsRepo.obterBooleano('modo_privacidade', false);
      setModoPrivacidade(priv);

      const bio = await settingsRepo.obterBooleano('biometria_habilitada', false);
      setBiometriaHabilitadaState(bio);
      if (bio) {
        setAutenticado(false);
      }
    })();
  }, [settingsRepo]);

  const alternarModoPrivacidade = async () => {
    AppHaptics.toqueSelecao();
    const novoValor = !modoPrivacidade;
    setModoPrivacidade(novoValor);
    await settingsRepo.definirBooleano('modo_privacidade', novoValor);
  };

  const setBiometriaHabilitada = async (habilitar: boolean) => {
    AppHaptics.toqueLeve();
    setBiometriaHabilitadaState(habilitar);
    await settingsRepo.definirBooleano('biometria_habilitada', habilitar);
  };

  const formatarValor = (valor: number): string => {
    if (modoPrivacidade) {
      return 'R$ •••••';
    }
    return formatarMoeda(valor);
  };

  const carregarCategorias = useCallback(async () => {
    try {
      const lista = await categoriesRepo.listarTodas();
      setCategorias(lista);
    } catch (e) {
      console.error('Erro ao carregar categorias:', e);
    }
  }, [categoriesRepo]);

  const carregarFavoritos = useCallback(async () => {
    try {
      const lista = await favoritesRepo.listar();
      setFavoritos(lista);
    } catch (e) {
      console.error('Erro ao carregar favoritos:', e);
    }
  }, [favoritesRepo]);

  const carregarStatusBackup = useCallback(async () => {
    try {
      const st = await backupRepo.verificarStatusBackup();
      setStatusBackup(st);
    } catch (e) {
      console.error('Erro ao verificar status do backup:', e);
    }
  }, [backupRepo]);

  const executarLancamentoFavorito = async (favorito: Favorito) => {
    try {
      AppHaptics.toqueSucesso();
      await transactionsRepo.criar({
        valor: favorito.valor,
        tipo: favorito.tipo,
        categoria_id: favorito.categoria_id,
        data: getDataHojeIso(),
        descricao: favorito.titulo,
        conciliado: 0,
        pago: 1,
        origem: 'manual',
      });
      await notificarMudancaDados();
    } catch (e) {
      console.error('Erro ao executar lançamento favorito:', e);
    }
  };

  const exportarRelatorioPdfMes = async (mesAno: string) => {
    try {
      AppHaptics.toqueLeve();
      const [resumo, ranking, analise, transacoes, recorrentes] = await Promise.all([
        transactionsRepo.obterResumoMes(mesAno),
        transactionsRepo.obterRankingCategorias(mesAno, 'despesa'),
        transactionsRepo.obterAnaliseEssencialVsEstilo(mesAno),
        transactionsRepo.listar({ mesAno }),
        recurringRepo.listar(),
      ]);

      await PdfReportService.gerarECompartilhar({
        mesAno,
        resumo,
        ranking,
        analiseEssencial: analise,
        transacoes,
        recorrentes,
      });
      AppHaptics.toqueSucesso();
    } catch (e) {
      console.error('Erro ao exportar PDF do mês:', e);
      throw e;
    }
  };

  const carregarDadosPainel = useCallback(async () => {
    try {
      await recurringRepo.processarRecorrentesDoMes(mesSelecionado);

      const [resumo, ranking, recentes, teto, analise] = await Promise.all([
        transactionsRepo.obterResumoMes(mesSelecionado),
        transactionsRepo.obterRankingCategorias(mesSelecionado, 'despesa'),
        transactionsRepo.listar({ mesAno: mesSelecionado, limite: 8 }),
        transactionsRepo.obterTetoDiario(mesSelecionado),
        transactionsRepo.obterAnaliseEssencialVsEstilo(mesSelecionado),
      ]);
      setResumoMes(resumo);
      setRankingGastos(ranking);
      setTransacoesRecentes(recentes);
      setTetoDiario(teto);
      setAnaliseEssencial(analise);
      await carregarStatusBackup();
    } catch (e) {
      console.error('Erro ao carregar painel:', e);
    }
  }, [transactionsRepo, recurringRepo, mesSelecionado, carregarStatusBackup]);

  const alternarStatusPago = async (id: number, novoStatus: number) => {
    try {
      AppHaptics.toqueSucesso();
      await transactionsRepo.alternarStatusPago(id, novoStatus);
      await carregarDadosPainel();
    } catch (e) {
      console.error('Erro ao alternar status pago:', e);
    }
  };

  const notificarMudancaDados = useCallback(async () => {
    await Promise.all([carregarCategorias(), carregarFavoritos(), carregarDadosPainel(), carregarStatusBackup()]);
  }, [carregarCategorias, carregarFavoritos, carregarDadosPainel, carregarStatusBackup]);

  useEffect(() => {
    carregarCategorias();
    carregarFavoritos();
    carregarStatusBackup();
  }, [carregarCategorias, carregarFavoritos, carregarStatusBackup]);

  useEffect(() => {
    carregarDadosPainel();
  }, [carregarDadosPainel, mesSelecionado]);

  // Controles do modal de transação
  const abrirModalNovoLancamento = (tipoInicial: TipoTransacao = 'despesa') => {
    AppHaptics.toqueLeve();
    setModalTransacaoTipoInicial(tipoInicial);
    setTransacaoParaEdicao(null);
    setTransacaoParaDuplicacao(null);
    setModalTransacaoAberto(true);
  };

  const abrirModalEditarLancamento = (transacao: Transacao) => {
    AppHaptics.toqueLeve();
    setTransacaoParaDuplicacao(null);
    setTransacaoParaEdicao(transacao);
    setModalTransacaoAberto(true);
  };

  const abrirModalDuplicarLancamento = (transacao: Transacao) => {
    AppHaptics.toqueLeve();
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
    AppHaptics.toqueLeve();
    setCategoriaParaEdicao(null);
    setModalCategoriaAberto(true);
  };

  const abrirModalEditarCategoria = (categoria: Categoria) => {
    AppHaptics.toqueLeve();
    setCategoriaParaEdicao(categoria);
    setModalCategoriaAberto(true);
  };

  const fecharModalCategoria = () => {
    setModalCategoriaAberto(false);
    setCategoriaParaEdicao(null);
  };

  // Controles do modal de fixos recorrentes
  const abrirModalRecorrentes = () => {
    AppHaptics.toqueLeve();
    setModalRecorrentesAberto(true);
  };

  const fecharModalRecorrentes = () => {
    setModalRecorrentesAberto(false);
  };

  return (
    <AppContext.Provider
      value={{
        categoriesRepo,
        transactionsRepo,
        backupRepo,
        settingsRepo,
        recurringRepo,
        favoritesRepo,
        learningRepo,
        reconciliationService,
        mesSelecionado,
        setMesSelecionado: (m) => {
          AppHaptics.toqueSelecao();
          setMesSelecionado(m);
        },
        categorias,
        carregarCategorias,
        favoritos,
        carregarFavoritos,
        executarLancamentoFavorito,
        statusBackup,
        carregarStatusBackup,
        exportarRelatorioPdfMes,
        resumoMes,
        rankingGastos,
        transacoesRecentes,
        tetoDiario,
        analiseEssencial,
        carregarDadosPainel,
        alternarStatusPago,
        modoPrivacidade,
        alternarModoPrivacidade,
        formatarValor,
        biometriaHabilitada,
        setBiometriaHabilitada,
        autenticado,
        setAutenticado,
        modalTransacaoAberto,
        modalTransacaoTipoInicial,
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
        modalRecorrentesAberto,
        abrirModalRecorrentes,
        fecharModalRecorrentes,
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
