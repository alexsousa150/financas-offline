import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { CategoriesRepository } from '../database/categoriesRepo';
import { TransactionsRepository } from '../database/transactionsRepo';
import { ContasRepository } from '../database/contasRepo';
import { CartoesRepository } from '../database/cartoesRepo';
import { FaturasRepository } from '../database/faturasRepo';
import { CreditCardEngine } from '../services/creditCardEngine';
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
  faturasRepo: FaturasRepository;
  backupRepo: BackupRepository;
  settingsRepo: SettingsRepository;
  recurringRepo: RecurringRepository;
  favoritesRepo: FavoritesRepository;
  learningRepo: LearningRepository;
  reconciliationService: ReconciliationService;
  creditCardEngine: CreditCardEngine;

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

  refreshKey: number;
  pagarFatura: (faturaId: number, contaId: number) => Promise<void>;
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
  const faturasRepo = React.useMemo(() => new FaturasRepository(db), [db]);
  const creditCardEngine = React.useMemo(() => new CreditCardEngine(db, cartoesRepo, faturasRepo, transactionsRepo), [db, cartoesRepo, faturasRepo, transactionsRepo]);
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
  const [refreshKey, setRefreshKey] = useState(0);

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

  const alternarStatusPago = async (id: number, novoStatus: number) => {
    try {
      AppHaptics.toqueSucesso();
      await transactionsRepo.alternarStatusPago(id, novoStatus);
      await notificarMudancaDados();
    } catch (e) {
      console.error('Erro ao alternar status pago:', e);
    }
  };

  const pagarFatura = async (faturaId: number, contaId: number) => {
    try {
      AppHaptics.toqueSucesso();
      await creditCardEngine.pagarFatura(faturaId, contaId);
      await notificarMudancaDados();
    } catch (e) {
      console.error('Erro ao pagar fatura:', e);
    }
  };

  const notificarMudancaDados = useCallback(async () => {
    setRefreshKey(prev => prev + 1);
    await Promise.all([
      carregarCategorias(),
      carregarContas(),
      carregarCartoes(),
      carregarFavoritos(),
      carregarStatusBackup(),
    ]);
  }, [carregarCategorias, carregarContas, carregarCartoes, carregarFavoritos, carregarStatusBackup]);

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

  return (
    <AppContext.Provider
      value={{
        ...modais,
        categoriesRepo,
        transactionsRepo,
        contasRepo,
        cartoesRepo,
        faturasRepo,
        backupRepo,
        settingsRepo,
        recurringRepo,
        favoritesRepo,
        learningRepo,
        reconciliationService,
        creditCardEngine,
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
        refreshKey,
        pagarFatura,
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
