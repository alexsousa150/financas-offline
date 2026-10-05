import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { CategoriesRepository } from '../database/categoriesRepo';
import { TransactionsRepository } from '../database/transactionsRepo';
import { ContasRepository } from '../database/contasRepo';
import { CartoesRepository } from '../database/cartoesRepo';
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
  Conta,
  Cartao,
  ResumoFinanceiro,
  RankingCategoria,
  TetoDiarioInfo,
  AnaliseEssencialVsEstilo,
  Favorito,
  TipoTransacao,
} from '../types';
import { getMesAnoAtualIso, formatarMoeda, getDataHojeIso } from '../utils/formatters';
import { AppHaptics } from '../utils/haptics';
import { useModals } from './ModalContext';

interface AppContextType {
  // Repositórios
  categoriesRepo: CategoriesRepository;
  transactionsRepo: TransactionsRepository;
  contasRepo: ContasRepository;
  cartoesRepo: CartoesRepository;
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

  contas: Conta[];
  setContas: React.Dispatch<React.SetStateAction<Conta[]>>;
  carregarContas: () => Promise<void>;

  cartoes: Cartao[];
  setCartoes: React.Dispatch<React.SetStateAction<Cartao[]>>;
  carregarCartoes: () => Promise<void>;

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
  definirModoPrivacidade: (priv: boolean) => Promise<void>;
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
  const contasRepo = React.useMemo(() => new ContasRepository(db), [db]);
  const cartoesRepo = React.useMemo(() => new CartoesRepository(db), [db]);
  const [backupRepo] = useState(() => new BackupRepository(db));
  const [settingsRepo] = useState(() => new SettingsRepository(db));
  const [recurringRepo] = useState(() => new RecurringRepository(db));
  const [favoritesRepo] = useState(() => new FavoritesRepository(db));
  const [learningRepo] = useState(() => new LearningRepository(db));
  const [reconciliationService] = useState(() => new ReconciliationService(transactionsRepo, learningRepo));

  const [mesSelecionado, setMesSelecionado] = useState<string>(getMesAnoAtualIso());
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
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

  // Delegação do estado dos modais globais para o ModalContext isolado
  const modais = useModals();

  // Carrega configurações iniciais (Privacidade e Biometria)
  useEffect(() => {
    (async () => {
      try {
        const [priv, bio] = await Promise.all([
          settingsRepo.obterBooleano('modo_privacidade', false),
          settingsRepo.obterBooleano('biometria_habilitada', false)
        ]);
        setModoPrivacidade(priv);
        setBiometriaHabilitadaState(bio);
        if (bio) {
          setAutenticado(false);
        }
      } catch (e) {
        console.error('Erro ao inicializar configuracoes:', e);
      }
    })();
  }, [settingsRepo]);

  // Re-bloqueio biométrico ao voltar do background (Ciclo de vida do App)
  const backgroundTimestampRef = useRef<number | null>(null);
  const biometriaHabilitadaRef = useRef(biometriaHabilitada);
  useEffect(() => {
    biometriaHabilitadaRef.current = biometriaHabilitada;
  }, [biometriaHabilitada]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
      } else if (nextAppState === 'active') {
        if (backgroundTimestampRef.current && biometriaHabilitadaRef.current) {
          const tempoForaMs = Date.now() - backgroundTimestampRef.current;
          // Se ficou fora por mais de 1 segundo, força re-autenticação biométrica
          if (tempoForaMs > 1000) {
            setAutenticado(false);
          }
        }
        backgroundTimestampRef.current = null;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const alternarModoPrivacidade = async () => {
    AppHaptics.toqueSelecao();
    const novoValor = !modoPrivacidade;
    setModoPrivacidade(novoValor);
    await settingsRepo.definirBooleano('modo_privacidade', novoValor);
  };

  const definirModoPrivacidade = async (habilitar: boolean) => {
    setModoPrivacidade(habilitar);
    await settingsRepo.definirBooleano('modo_privacidade', habilitar);
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

  const carregarContas = useCallback(async () => {
    try {
      const lista = await contasRepo.buscarTodas();
      setContas(lista);
    } catch (e) {
      console.error('Erro ao carregar contas:', e);
    }
  }, [contasRepo]);

  const carregarCartoes = useCallback(async () => {
    try {
      const lista = await cartoesRepo.buscarTodos();
      setCartoes(lista);
    } catch (e) {
      console.error('Erro ao carregar cartoes:', e);
    }
  }, [cartoesRepo]);

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
    await Promise.all([carregarCategorias(), carregarContas(), carregarCartoes(), carregarFavoritos(), carregarDadosPainel(), carregarStatusBackup()]);
  }, [carregarCategorias, carregarContas, carregarCartoes, carregarFavoritos, carregarDadosPainel, carregarStatusBackup]);

  useEffect(() => {
    carregarCategorias();
    carregarContas();
    carregarCartoes();
    carregarFavoritos();
    carregarStatusBackup();
    transactionsRepo.expurgarLixeiraAntiga(30).catch((e) => {
      console.error('Erro ao expurgar lixeira antiga:', e);
    });
  }, [carregarCategorias, carregarContas, carregarCartoes, carregarFavoritos, carregarStatusBackup, transactionsRepo]);

  useEffect(() => {
    carregarDadosPainel();
  }, [carregarDadosPainel, mesSelecionado]);

  return (
    <AppContext.Provider
      value={{
        ...modais,
        categoriesRepo,
        transactionsRepo,
        contasRepo,
        cartoesRepo,
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
        contas,
        setContas,
        carregarContas,
        cartoes,
        setCartoes,
        carregarCartoes,
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
        definirModoPrivacidade,
        formatarValor,
        biometriaHabilitada,
        setBiometriaHabilitada,
        autenticado,
        setAutenticado,
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
