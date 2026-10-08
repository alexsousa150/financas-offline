import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { BackupData, Transacao, IoniconsName } from '../types';
import { NotificationService } from '../services/notificationService';
import { AppHaptics } from '../utils/haptics';
import { APP_VERSION, APP_BUILD } from '../utils/version';
import { formatarMoeda, formatarDataBr } from '../utils/formatters';

export const SettingsScreen: React.FC = () => {
  const { theme, modo, setModo } = useTheme();
  const {
    backupRepo,
    settingsRepo,
    transactionsRepo,
    recurringRepo,
    favoritesRepo,
    favoritos,
    carregarFavoritos,
    statusBackup,
    carregarStatusBackup,
    exportarRelatorioPdfMes,
    mesSelecionado,
    notificarMudancaDados,
    biometriaHabilitada,
    setBiometriaHabilitada,
    modoPrivacidade,
    definirModoPrivacidade,
    abrirModalRecorrentes,
  } = useApp();

  const insets = useSafeAreaInsets();

  const [exportando, setExportando] = useState(false);
  const [exportandoCsv, setExportandoCsv] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  // Estados de configurações editáveis
  const [temaSelecionado, setTemaSelecionado] = useState<'escuro' | 'claro' | 'sistema'>(modo);
  const [temaSalvo, setTemaSalvo] = useState<'escuro' | 'claro' | 'sistema'>(modo);

  const [lembretesAtivos, setLembretesAtivos] = useState(true);
  const [lembretesSalvo, setLembretesSalvo] = useState(true);

  const [biometriaAtiva, setBiometriaAtiva] = useState(biometriaHabilitada);
  const [biometriaSalvo, setBiometriaSalvo] = useState(biometriaHabilitada);

  const [privacidadeAtiva, setPrivacidadeAtiva] = useState(modoPrivacidade);
  const [privacidadeSalvo, setPrivacidadeSalvo] = useState(modoPrivacidade);

  const [salvando, setSalvando] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  const [contasFixasQtd, setContasFixasQtd] = useState(0);
  const [totalFixasMensal, setTotalFixasMensal] = useState(0);

  // Estados da Lixeira de lançamentos (Soft delete)
  const [modalLixeiraVisivel, setModalLixeiraVisivel] = useState(false);
  const [itensLixeira, setItensLixeira] = useState<Transacao[]>([]);
  const [carregandoLixeira, setCarregandoLixeira] = useState(false);

  // Verifica se há alguma alteração não salva
  const houveAlteracoes =
    temaSelecionado !== temaSalvo ||
    lembretesAtivos !== lembretesSalvo ||
    biometriaAtiva !== biometriaSalvo ||
    privacidadeAtiva !== privacidadeSalvo;

  // Refs para contingência ao fechar a tela sem salvar
  const temaRef = useRef(temaSelecionado);
  const lembretesRef = useRef(lembretesAtivos);
  const biometriaRef = useRef(biometriaAtiva);
  const privacidadeRef = useRef(privacidadeAtiva);

  useEffect(() => {
    temaRef.current = temaSelecionado;
    lembretesRef.current = lembretesAtivos;
    biometriaRef.current = biometriaAtiva;
    privacidadeRef.current = privacidadeAtiva;
  }, [temaSelecionado, lembretesAtivos, biometriaAtiva, privacidadeAtiva]);

  // Contingência: persistência silenciosa ao desmontar para evitar qualquer perda
  useEffect(() => {
    return () => {
      (async () => {
        try {
          await settingsRepo.definir('tema_modo', temaRef.current);
          await settingsRepo.definirBooleano('lembretes_habilitados', lembretesRef.current);
          await settingsRepo.definirBooleano('biometria_habilitada', biometriaRef.current);
          await settingsRepo.definirBooleano('modo_privacidade', privacidadeRef.current);
        } catch {
          // Contingência silenciosa
        }
      })();
    };
  }, [settingsRepo]);

  const carregarResumoContasFixas = useCallback(async () => {
    try {
      const lista = await recurringRepo.listar();
      const ativas = lista.filter((i) => i.ativo === 1);
      setContasFixasQtd(ativas.length);
      const totalDespesas = ativas
        .filter((i) => i.tipo === 'despesa')
        .reduce((acc, i) => acc + i.valor, 0);
      setTotalFixasMensal(totalDespesas);
    } catch (e) {
      console.error('Erro ao carregar resumo de contas fixas:', e);
    }
  }, [recurringRepo]);

  const carregarLixeira = useCallback(async () => {
    try {
      const lista = await transactionsRepo.listarLixeira();
      setItensLixeira(lista);
    } catch (e) {
      console.error('Erro ao carregar lixeira:', e);
    }
  }, [transactionsRepo]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [lemb, priv, bio] = await Promise.all([
          settingsRepo.obterBooleano('lembretes_habilitados', true),
          settingsRepo.obterBooleano('modo_privacidade', false),
          settingsRepo.obterBooleano('biometria_habilitada', false),
        ]);

        if (ativo) {
          setLembretesAtivos(lemb);
          setLembretesSalvo(lemb);
          setPrivacidadeAtiva(priv);
          setPrivacidadeSalvo(priv);
          setBiometriaAtiva(bio);
          setBiometriaSalvo(bio);
          setTemaSelecionado(modo);
          setTemaSalvo(modo);
        }

        await Promise.all([
          carregarResumoContasFixas(),
          carregarStatusBackup(),
          carregarFavoritos(),
          carregarLixeira(),
        ]);
      } catch (e) {
        console.error('Erro ao inicializar configurações:', e);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [settingsRepo, modo, carregarResumoContasFixas, carregarStatusBackup, carregarFavoritos, carregarLixeira]);

  const handleAlternarBiometria = async (novoValor: boolean) => {
    AppHaptics.toqueLeve();
    if (novoValor) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometria indisponível',
          'Cadastre uma digital ou reconhecimento facial nas configurações do Android para usar este recurso.'
        );
        setBiometriaAtiva(false);
        return;
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua biometria para ativar o bloqueio',
        fallbackLabel: 'Usar senha',
      });

      if (res.success) {
        AppHaptics.toqueSucesso();
        setBiometriaAtiva(true);
      } else {
        AppHaptics.toqueAviso();
        setBiometriaAtiva(false);
      }
    } else {
      setBiometriaAtiva(false);
    }
  };

  const handleAlternarLembretes = async (novoValor: boolean) => {
    AppHaptics.toqueLeve();
    if (novoValor) {
      const permitido = await NotificationService.solicitarPermissao();
      if (!permitido) {
        Alert.alert(
          'Permissão necessária',
          'Ative as notificações para receber avisos na data de vencimento das contas.'
        );
      }
    }
    setLembretesAtivos(novoValor);
  };

  const handleAlternarPrivacidade = (novoValor: boolean) => {
    AppHaptics.toqueLeve();
    setPrivacidadeAtiva(novoValor);
  };

  const handleSelecionarTema = async (novoModo: 'escuro' | 'claro' | 'sistema') => {
    AppHaptics.toqueSelecao();
    setTemaSelecionado(novoModo);
    // Aplica pré-visualização imediata do tema para boa UX
    await setModo(novoModo);
  };

  const handleSalvar = async () => {
    try {
      setSalvando(true);
      AppHaptics.toqueLeve();

      // 1. Salvar tema no SQLite e aplicar no contexto
      await setModo(temaSelecionado);
      await settingsRepo.definir('tema_modo', temaSelecionado);

      // 2. Salvar lembretes de vencimento
      await settingsRepo.definirBooleano('lembretes_habilitados', lembretesAtivos);

      // 3. Salvar biometria
      await setBiometriaHabilitada(biometriaAtiva);

      // 4. Salvar modo privacidade
      await definirModoPrivacidade(privacidadeAtiva);

      // Atualiza estado de referência para indicar que tudo está salvo
      setTemaSalvo(temaSelecionado);
      setLembretesSalvo(lembretesAtivos);
      setBiometriaSalvo(biometriaAtiva);
      setPrivacidadeSalvo(privacidadeAtiva);

      AppHaptics.toqueSucesso();
      setSalvoComSucesso(true);
      setTimeout(() => {
        setSalvoComSucesso(false);
      }, 3500);

      Alert.alert(
        'Configurações salvas',
        'Todas as suas preferências foram salvas com sucesso no banco de dados deste aparelho.',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      AppHaptics.toqueAviso();
      Alert.alert(
        'Erro ao salvar',
        'Não foi possível salvar as configurações: ' + (e?.message || 'Tente novamente.')
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleExportar = async () => {
    try {
      AppHaptics.toqueLeve();
      setExportando(true);
      await backupRepo.exportarBackup();
      await carregarStatusBackup();
      AppHaptics.toqueSucesso();
    } catch (e: any) {
      Alert.alert('Falha no backup', 'Não foi possível exportar os dados. ' + (e.message || ''));
    } finally {
      setExportando(false);
    }
  };

  const handleExportarPdf = async () => {
    try {
      AppHaptics.toqueLeve();
      setExportandoPdf(true);
      await exportarRelatorioPdfMes(mesSelecionado);
      AppHaptics.toqueSucesso();
    } catch (e: any) {
      Alert.alert('Erro ao gerar relatório', 'Não foi possível gerar o arquivo PDF. ' + (e.message || ''));
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleExportarCsv = async () => {
    try {
      AppHaptics.toqueLeve();
      setExportandoCsv(true);
      await backupRepo.exportarPlanilhaCsv();
      AppHaptics.toqueSucesso();
    } catch {
      Alert.alert('Erro ao exportar', 'Não foi possível gerar a planilha.');
    } finally {
      setExportandoCsv(false);
    }
  };

  const handleRemoverFavorito = (id: number, titulo: string) => {
    Alert.alert(
      'Remover favorito?',
      `Deseja excluir o atalho "${titulo}" da lista de lançamentos rápidos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await favoritesRepo.excluir(id);
              await carregarFavoritos();
              AppHaptics.toqueSucesso();
            } catch {
              Alert.alert('Erro', 'Não foi possível remover o favorito.');
            }
          },
        },
      ]
    );
  };

  const handleLimparHistorico = () => {
    Alert.alert(
      'Limpar histórico de lançamentos?',
      'Esta ação apagará as receitas e despesas registradas. Suas categorias e contas fixas serão mantidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar lançamentos',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionsRepo.limparHistorico();
              await notificarMudancaDados();
              AppHaptics.toqueSucesso();
              Alert.alert('Histórico limpo', 'Os lançamentos foram removidos com sucesso.');
            } catch {
              Alert.alert('Erro', 'Não foi possível limpar os lançamentos.');
            }
          },
        },
      ]
    );
  };

  const handleRestaurar = async () => {
    Alert.alert(
      'Atenção ao restaurar',
      'Ao restaurar um arquivo de backup, os dados atuais serão substituídos pelos do arquivo. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Selecionar arquivo',
          onPress: async () => {
            try {
              setRestaurando(true);
              const resultado = await DocumentPicker.getDocumentAsync({
                type: ['application/json', '*/*'],
                copyToCacheDirectory: true,
              });

              if (resultado.canceled || !resultado.assets || resultado.assets.length === 0) {
                setRestaurando(false);
                return;
              }

              const conteudo = await FileSystem.readAsStringAsync(resultado.assets[0].uri, {
                encoding: FileSystem.EncodingType.UTF8,
              });

              const dados: BackupData = JSON.parse(conteudo);
              const stats = await backupRepo.restaurarBackup(dados);
              await notificarMudancaDados();
              await carregarResumoContasFixas();
              AppHaptics.toqueSucesso();

              Alert.alert(
                'Backup restaurado',
                `${stats.categoriasRestauradas} categorias e ${stats.transacoesRestauradas} lançamentos foram recuperados.`
              );
            } catch {
              Alert.alert('Erro ao restaurar', 'O arquivo selecionado não é um backup válido.');
            } finally {
              setRestaurando(false);
            }
          },
        },
      ]
    );
  };

  const handleAbrirLixeira = async () => {
    AppHaptics.toqueLeve();
    setCarregandoLixeira(true);
    setModalLixeiraVisivel(true);
    await carregarLixeira();
    setCarregandoLixeira(false);
  };

  const handleRestaurarItemLixeira = async (item: Transacao) => {
    try {
      AppHaptics.toqueSucesso();
      await transactionsRepo.restaurar(item.id);
      await carregarLixeira();
      await notificarMudancaDados();
      Alert.alert('Lançamento restaurado', `"${item.descricao}" voltou para o seu extrato.`);
    } catch (e) {
      console.error('Erro ao restaurar:', e);
      Alert.alert('Erro', 'Não foi possível restaurar este lançamento.');
    }
  };

  const handleExcluirDefinitivoItem = (item: Transacao) => {
    Alert.alert(
      'Excluir definitivamente?',
      `Deseja apagar "${item.descricao}" permanentemente? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir definitivamente',
          style: 'destructive',
          onPress: async () => {
            try {
              AppHaptics.toqueAviso();
              await transactionsRepo.excluirDefinitivo(item.id);
              await carregarLixeira();
            } catch (e) {
              console.error('Erro ao excluir definitivo:', e);
              Alert.alert('Erro', 'Não foi possível excluir o lançamento.');
            }
          },
        },
      ]
    );
  };

  const handleEsvaziarLixeira = () => {
    if (itensLixeira.length === 0) return;
    Alert.alert(
      'Esvaziar lixeira?',
      `Tem certeza que deseja apagar permanentemente todos os ${itensLixeira.length} lançamentos excluídos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Esvaziar agora',
          style: 'destructive',
          onPress: async () => {
            try {
              AppHaptics.toqueAviso();
              await transactionsRepo.esvaziarLixeira();
              await carregarLixeira();
              Alert.alert('Lixeira esvaziada', 'Todos os lançamentos foram apagados definitivamente.');
            } catch (e) {
              console.error('Erro ao esvaziar lixeira:', e);
              Alert.alert('Erro', 'Não foi possível esvaziar a lixeira.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.telaWrapper, { backgroundColor: theme.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + Math.max(insets.bottom, 14) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho com Ação Direta de Salvar no Topo */}
        <View style={styles.topoContainer}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.tituloPagina, { color: theme.text }]}>Configurações</Text>
            <Text style={[styles.subtituloPagina, { color: theme.textSecondary }]}>
              Preferências, segurança e armazenamento local
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.botaoSalvarTopo,
              {
                backgroundColor: houveAlteracoes ? theme.primary : theme.inputBg,
                borderColor: houveAlteracoes ? theme.primary : theme.inputBorder,
              },
            ]}
            onPress={handleSalvar}
            disabled={salvando}
            activeOpacity={0.8}
          >
            {salvando ? (
              <ActivityIndicator size="small" color={houveAlteracoes ? '#FFFFFF' : theme.text} />
            ) : (
              <>
                <Ionicons
                  name={salvoComSucesso ? 'checkmark-circle' : 'save-outline'}
                  size={16}
                  color={houveAlteracoes ? '#FFFFFF' : theme.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.textoBotaoSalvarTopo,
                    { color: houveAlteracoes ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {salvoComSucesso ? 'Salvo' : 'Salvar'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Aviso destacado quando há alterações não salvas */}
        {houveAlteracoes && (
          <TouchableOpacity
            style={[
              styles.bannerAlteracoesPendentes,
              { backgroundColor: theme.warningLight, borderColor: theme.warning },
            ]}
            onPress={handleSalvar}
            activeOpacity={0.85}
          >
            <Ionicons name="information-circle" size={20} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloBannerAlteracoes, { color: theme.text }]}>
                Alterações não salvas
              </Text>
              <Text style={[styles.subtituloBannerAlteracoes, { color: theme.textSecondary }]}>
                Toque aqui ou no botão Salvar abaixo para gravar suas preferências no banco de dados.
              </Text>
            </View>
            <View style={[styles.badgeAcaoBanner, { backgroundColor: theme.warning }]}>
              <Text style={styles.textoBadgeAcaoBanner}>Salvar agora</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Feedback visual quando salvo com sucesso */}
        {salvoComSucesso && (
          <View
            style={[
              styles.bannerSalvoSucesso,
              { backgroundColor: theme.successLight, borderColor: theme.success },
            ]}
          >
            <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            <Text style={[styles.textoBannerSalvoSucesso, { color: theme.success }]}>
              Configurações salvas com sucesso no seu aparelho!
            </Text>
          </View>
        )}

        {/* Banner de Aviso de Backup Periódico */}
        {statusBackup.precisaBackup && (
          <View
            style={[
              styles.cardAlertaBackup,
              { backgroundColor: theme.warningLight, borderColor: theme.warning },
            ]}
          >
            <View style={styles.topoAlertaBackup}>
              <View style={[styles.circuloAlertaBackup, { backgroundColor: theme.warning }]}>
                <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tituloAlertaBackup, { color: theme.text }]}>
                  Cópia de segurança recomendada
                </Text>
                <Text style={[styles.descAlertaBackup, { color: theme.textSecondary }]}>
                  {statusBackup.diasSemBackup !== null
                    ? `Você tem ${statusBackup.novosLancamentos} novos lançamentos desde o último backup há ${statusBackup.diasSemBackup} dias.`
                    : `Você já possui ${statusBackup.novosLancamentos} lançamentos sem nenhuma cópia salva.`}{' '}
                  Exporte um backup para proteger seus dados contra imprevistos.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.botaoAlertaBackup, { backgroundColor: theme.warning }]}
              onPress={handleExportar}
              disabled={exportando}
              activeOpacity={0.8}
            >
              {exportando ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.textoBotaoAlertaBackup}>Fazer backup agora</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Seção Aparência */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.linhaCabecalhoSecao}>
            <Text style={[styles.tituloSecao, { color: theme.text, marginBottom: 0 }]}>Aparência</Text>
            {temaSelecionado !== temaSalvo ? (
              <View style={[styles.badgePendente, { backgroundColor: theme.warningLight }]}>
                <Ionicons name="ellipse" size={8} color={theme.warning} />
                <Text style={[styles.textoBadgePendente, { color: theme.warning }]}>Pendente</Text>
              </View>
            ) : (
              <View style={[styles.badgeSalvo, { backgroundColor: theme.successLight }]}>
                <Ionicons name="checkmark-circle" size={13} color={theme.success} />
                <Text style={[styles.textoBadgeSalvo, { color: theme.success }]}>Salvo</Text>
              </View>
            )}
          </View>
          <Text style={[styles.descricaoSecao, { color: theme.textSecondary, marginTop: 4, marginBottom: 12 }]}>
            Escolha o tema visual do aplicativo. Toque em Salvar para persistir a preferência no banco deste aparelho.
          </Text>

          <View style={styles.linhaOpcoesTema}>
            <TouchableOpacity
              style={[
                styles.opcaoTema,
                {
                  backgroundColor: temaSelecionado === 'escuro' ? theme.primaryLight : theme.inputBg,
                  borderColor: temaSelecionado === 'escuro' ? theme.primary : theme.inputBorder,
                },
              ]}
              onPress={() => handleSelecionarTema('escuro')}
            >
              <Ionicons
                name="moon"
                size={20}
                color={temaSelecionado === 'escuro' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.textoOpcaoTema,
                  { color: temaSelecionado === 'escuro' ? theme.primary : theme.text },
                ]}
              >
                Escuro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.opcaoTema,
                {
                  backgroundColor: temaSelecionado === 'claro' ? theme.primaryLight : theme.inputBg,
                  borderColor: temaSelecionado === 'claro' ? theme.primary : theme.inputBorder,
                },
              ]}
              onPress={() => handleSelecionarTema('claro')}
            >
              <Ionicons
                name="sunny"
                size={20}
                color={temaSelecionado === 'claro' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.textoOpcaoTema,
                  { color: temaSelecionado === 'claro' ? theme.primary : theme.text },
                ]}
              >
                Claro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.opcaoTema,
                {
                  backgroundColor: temaSelecionado === 'sistema' ? theme.primaryLight : theme.inputBg,
                  borderColor: temaSelecionado === 'sistema' ? theme.primary : theme.inputBorder,
                },
              ]}
              onPress={() => handleSelecionarTema('sistema')}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={temaSelecionado === 'sistema' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.textoOpcaoTema,
                  { color: temaSelecionado === 'sistema' ? theme.primary : theme.text },
                ]}
              >
                Sistema
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção Contas Fixas e Lembretes */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Contas e rendas fixas</Text>
          <Text style={[styles.descricaoSecao, { color: theme.textSecondary }]}>
            Cadastre contas a pagar e rendas que se repetem todo mês. Você pode definir o dia de vencimento, o valor e cadastrar quantas contas precisar.
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.itemLink, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
            onPress={async () => {
              abrirModalRecorrentes();
              setTimeout(carregarResumoContasFixas, 1000);
            }}
          >
            <View style={[styles.circuloIconeItem, { backgroundColor: theme.warningLight }]}>
              <Ionicons name="repeat-outline" size={20} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
                Gerenciar contas fixas
              </Text>
              <Text style={[styles.descItemConfig, { color: theme.textSecondary }]}>
                {contasFixasQtd > 0
                  ? `${contasFixasQtd} conta${contasFixasQtd === 1 ? '' : 's'} ativa${contasFixasQtd === 1 ? '' : 's'} • ${formatarMoeda(totalFixasMensal)}/mês`
                  : 'Cadastrar nova conta com vencimento e valor'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.linhaInterruptor, { marginTop: 14 }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
                  Lembretes de vencimento
                </Text>
                {lembretesAtivos !== lembretesSalvo && (
                  <View style={[styles.pontoPendente, { backgroundColor: theme.warning }]} />
                )}
              </View>
              <Text style={[styles.descItemConfig, { color: theme.textSecondary }]}>
                Notificação no aparelho às 09:00 no dia de vencimento das contas cadastradas
              </Text>
            </View>
            <Switch
              value={lembretesAtivos}
              onValueChange={handleAlternarLembretes}
              thumbColor={lembretesAtivos ? theme.primary : '#A1A1AA'}
              trackColor={{ false: '#71717A', true: theme.primaryLight }}
            />
          </View>
        </View>

        {/* Seção Segurança e Privacidade */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Segurança e privacidade</Text>

          {/* Bloqueio por biometria */}
          <View style={styles.linhaInterruptor}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
                  Bloqueio por biometria
                </Text>
                {biometriaAtiva !== biometriaSalvo && (
                  <View style={[styles.pontoPendente, { backgroundColor: theme.warning }]} />
                )}
              </View>
              <Text style={[styles.descItemConfig, { color: theme.textSecondary }]}>
                Solicita impressão digital ou reconhecimento facial ao abrir o aplicativo
              </Text>
            </View>
            <Switch
              value={biometriaAtiva}
              onValueChange={handleAlternarBiometria}
              thumbColor={biometriaAtiva ? theme.primary : '#A1A1AA'}
              trackColor={{ false: '#71717A', true: theme.primaryLight }}
            />
          </View>

          <View style={styles.divisorInterno} />

          {/* Modo Privacidade padrão */}
          <View style={styles.linhaInterruptor}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
                  Ocultar saldos por padrão
                </Text>
                {privacidadeAtiva !== privacidadeSalvo && (
                  <View style={[styles.pontoPendente, { backgroundColor: theme.warning }]} />
                )}
              </View>
              <Text style={[styles.descItemConfig, { color: theme.textSecondary }]}>
                Inicia o aplicativo com valores ocultos (•••••) para manter a privacidade em locais públicos
              </Text>
            </View>
            <Switch
              value={privacidadeAtiva}
              onValueChange={handleAlternarPrivacidade}
              thumbColor={privacidadeAtiva ? theme.primary : '#A1A1AA'}
              trackColor={{ false: '#71717A', true: theme.primaryLight }}
            />
          </View>
        </View>

        {/* Seção Lançamentos Favoritos (1 toque) */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.linhaCabecalhoSecao}>
            <Text style={[styles.tituloSecao, { color: theme.text, marginBottom: 0 }]}>
              Lançamentos favoritos (1 toque)
            </Text>
            <View style={[styles.badgeContagem, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.textoBadgeContagem, { color: theme.primary }]}>
                {favoritos.length} atalho{favoritos.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
          <Text style={[styles.descricaoSecao, { color: theme.textSecondary, marginTop: 4, marginBottom: 12 }]}>
            Gastos frequentes prontos para registro instantâneo com 1 toque no botão de novo lançamento (+).
          </Text>

          <View style={styles.gradeFavoritos}>
            {favoritos.map((fav) => (
              <View
                key={fav.id}
                style={[
                  styles.itemFavoritoConfig,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <View
                  style={[
                    styles.circuloIconeFavorito,
                    { backgroundColor: fav.categoria_cor ? `${fav.categoria_cor}20` : theme.primaryLight },
                  ]}
                >
                  <Ionicons
                    name={(fav.icone || fav.categoria_icone || 'pricetag-outline') as IoniconsName}
                    size={16}
                    color={fav.categoria_cor || theme.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nomeFavoritoConfig, { color: theme.text }]} numberOfLines={1}>
                    {fav.titulo}
                  </Text>
                  <Text style={[styles.valorFavoritoConfig, { color: theme.textSecondary }]}>
                    {formatarMoeda(fav.valor)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoverFavorito(fav.id, fav.titulo)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.botaoExcluirFavorito}
                >
                  <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Seção Backup e Dados Locais */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.tituloSecao, { color: theme.text }]}>Backup e dados locais</Text>
          <Text style={[styles.descricaoSecao, { color: theme.textSecondary }]}>
            Seus dados ficam gravados exclusivamente neste celular. Exporte um arquivo de backup periodicamente para guardar uma cópia segura ou migrar para outro aparelho.
          </Text>

          <View style={[styles.boxStatusBackup, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Ionicons
              name={statusBackup.precisaBackup ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={18}
              color={statusBackup.precisaBackup ? theme.warning : theme.success}
            />
            <Text style={[styles.textoStatusBackup, { color: theme.textSecondary }]}>
              {statusBackup.ultimoBackupEm
                ? `Último backup: ${new Date(statusBackup.ultimoBackupEm).toLocaleDateString('pt-BR')} (${statusBackup.novosLancamentos} novos lançamentos)`
                : `Nenhum backup realizado ainda (${statusBackup.novosLancamentos} lançamentos sem cópia)`}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.botaoAcao, { backgroundColor: theme.primary }]}
            onPress={handleExportar}
            disabled={exportando}
          >
            {exportando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.textoBotaoAcao}>Exportar backup dos dados (JSON)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoAcaoSecundario, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, marginBottom: 10 }]}
            onPress={handleExportarPdf}
            disabled={exportandoPdf}
          >
            {exportandoPdf ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Ionicons name="document-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.textoBotaoAcaoSecundario, { color: theme.text }]}>
                  Exportar fechamento mensal (PDF)
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoAcaoSecundario, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
            onPress={handleRestaurar}
            disabled={restaurando}
          >
            {restaurando ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color={theme.text} style={{ marginRight: 8 }} />
                <Text style={[styles.textoBotaoAcaoSecundario, { color: theme.text }]}>
                  Restaurar a partir de um backup
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoAcaoSecundario, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, marginTop: 10 }]}
            onPress={handleExportarCsv}
            disabled={exportandoCsv}
          >
            {exportandoCsv ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color={theme.text} style={{ marginRight: 8 }} />
                <Text style={[styles.textoBotaoAcaoSecundario, { color: theme.text }]}>
                  Exportar planilha (CSV)
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoAcaoSecundario, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, marginTop: 10 }]}
            onPress={handleAbrirLixeira}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-bin-outline" size={20} color={theme.text} style={{ marginRight: 8 }} />
            <Text style={[styles.textoBotaoAcaoSecundario, { color: theme.text, flex: 1 }]}>
              Lixeira de lançamentos
            </Text>
            {itensLixeira.length > 0 && (
              <View style={[styles.badgeLixeira, { backgroundColor: theme.dangerLight }]}>
                <Text style={[styles.textoBadgeLixeira, { color: theme.danger }]}>
                  {itensLixeira.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoAcaoSecundario, { backgroundColor: theme.dangerLight, borderColor: theme.danger, marginTop: 10 }]}
            onPress={handleLimparHistorico}
          >
            <Ionicons name="trash-outline" size={18} color={theme.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.textoBotaoAcaoSecundario, { color: theme.danger }]}>
              Apagar histórico de lançamentos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Armazenamento local e privacidade */}
        <View style={[styles.cardPrivacidade, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.linhaSelo}>
            <View style={[styles.circuloSelo, { backgroundColor: theme.successLight }]}>
              <Ionicons name="shield-checkmark" size={24} color={theme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tituloPrivacidade, { color: theme.text }]}>Armazenamento local e privacidade</Text>
              <Text style={[styles.subtituloPrivacidade, { color: theme.textSecondary }]}>
                Seus registros financeiros ficam apenas neste aparelho.
              </Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.itemPrivacidade}>
            <Ionicons name="wifi-outline" size={18} color={theme.success} />
            <Text style={[styles.textoItemPrivacidade, { color: theme.textSecondary }]}>
              Sem conexão externa. O aplicativo não envia dados para servidores na internet.
            </Text>
          </View>

          <View style={styles.itemPrivacidade}>
            <Ionicons name="hardware-chip-outline" size={18} color={theme.primary} />
            <Text style={[styles.textoItemPrivacidade, { color: theme.textSecondary }]}>
              Banco de dados SQLite gravado na memória interna do próprio celular.
            </Text>
          </View>

          <View style={styles.itemPrivacidade}>
            <Ionicons name="finger-print" size={18} color={theme.warning} />
            <Text style={[styles.textoItemPrivacidade, { color: theme.textSecondary }]}>
              Acesso opcional com proteção biométrica nativa do sistema operacional.
            </Text>
          </View>
        </View>

        <Text style={[styles.versaoTexto, { color: theme.textMuted }]}>
          Finanças Offline • v{APP_VERSION} (Build {APP_BUILD})
        </Text>
      </ScrollView>

      {/* BARRA INFERIOR FIXA COM BOTÃO SALVAR CONFIGURAÇÕES */}
      <View
        style={[
          styles.barraInferiorFixa,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.cardBorder,
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.botaoSalvarGrande,
            {
              backgroundColor: houveAlteracoes ? theme.primary : (theme.isDark ? '#22232B' : '#E4E7EB'),
              borderColor: houveAlteracoes ? theme.primary : (theme.isDark ? '#333542' : '#D1D5DB'),
            },
          ]}
          onPress={handleSalvar}
          disabled={salvando}
          activeOpacity={0.8}
        >
          {salvando ? (
            <View style={styles.linhaSalvarInterna}>
              <ActivityIndicator color={houveAlteracoes ? '#FFFFFF' : theme.text} size="small" />
              <Text
                style={[
                  styles.textoBotaoSalvarGrande,
                  { color: houveAlteracoes ? '#FFFFFF' : theme.text },
                ]}
              >
                Salvando configurações...
              </Text>
            </View>
          ) : (
            <View style={styles.linhaSalvarInterna}>
              <Ionicons
                name={
                  salvoComSucesso
                    ? 'checkmark-circle'
                    : houveAlteracoes
                    ? 'save'
                    : 'checkmark-circle-outline'
                }
                size={21}
                color={houveAlteracoes ? '#FFFFFF' : (theme.isDark ? '#E4E4E7' : '#374151')}
              />
              <Text
                style={[
                  styles.textoBotaoSalvarGrande,
                  {
                    color: houveAlteracoes ? '#FFFFFF' : (theme.isDark ? '#E4E4E7' : '#374151'),
                  },
                ]}
              >
                {salvoComSucesso
                  ? 'Configurações salvas!'
                  : houveAlteracoes
                  ? 'Salvar alterações'
                  : 'Salvar configurações'}
              </Text>
              {houveAlteracoes && (
                <View style={[styles.bolinhaAlerta, { backgroundColor: '#F59E0B' }]} />
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal da Lixeira de Lançamentos */}
      <Modal
        visible={modalLixeiraVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalLixeiraVisivel(false)}
      >
        <View style={styles.modalFundo}>
          <View style={[styles.modalConteudoLixeira, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {/* Cabeçalho do Modal */}
            <View style={styles.modalCabecalhoLixeira}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.modalTituloLixeira, { color: theme.text }]}>Lixeira</Text>
                  {itensLixeira.length > 0 && (
                    <View style={[styles.badgeLixeira, { backgroundColor: theme.dangerLight }]}>
                      <Text style={[styles.textoBadgeLixeira, { color: theme.danger }]}>
                        {itensLixeira.length}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.modalSubtituloLixeira, { color: theme.textSecondary }]}>
                  Itens apagados ficam salvos por até 30 dias para recuperação
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalLixeiraVisivel(false)}
                style={[styles.botaoFecharModal, { backgroundColor: theme.inputBg }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Barra de Ação Esvaziar */}
            {itensLixeira.length > 0 && (
              <View style={styles.barraAcoesLixeira}>
                <TouchableOpacity
                  style={[styles.botaoEsvaziarLixeira, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}
                  onPress={handleEsvaziarLixeira}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={15} color={theme.danger} style={{ marginRight: 6 }} />
                  <Text style={[styles.textoBotaoEsvaziar, { color: theme.danger }]}>Esvaziar lixeira</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Lista ou Estado Vazio */}
            {carregandoLixeira ? (
              <View style={styles.centroCarregamentoLixeira}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : itensLixeira.length === 0 ? (
              <View style={styles.vazioLixeiraContainer}>
                <View style={[styles.circuloVazioLixeira, { backgroundColor: theme.inputBg }]}>
                  <Ionicons name="trash-bin-outline" size={40} color={theme.textMuted} />
                </View>
                <Text style={[styles.textoVazioLixeira, { color: theme.text }]}>A lixeira está vazia</Text>
                <Text style={[styles.subtextoVazioLixeira, { color: theme.textSecondary }]}>
                  Nenhum lançamento foi excluído nos últimos 30 dias.
                </Text>
              </View>
            ) : (
              <FlatList
                data={itensLixeira}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
                renderItem={({ item }) => {
                  const dataFormatada = formatarDataBr(item.data);
                  const dataExclusaoFormatada = item.deleted_at
                    ? formatarDataBr(item.deleted_at.split('T')[0])
                    : '';
                  const ehReceita = item.tipo === 'receita';

                  return (
                    <View
                      style={[
                        styles.itemLixeiraCard,
                        { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                      ]}
                    >
                      <View style={styles.itemLixeiraCorpo}>
                        <View
                          style={[
                            styles.itemLixeiraIcone,
                            { backgroundColor: item.categoria_cor ? `${item.categoria_cor}20` : theme.primaryLight },
                          ]}
                        >
                          <Ionicons
                            name={(item.categoria_icone || 'pricetag-outline') as IoniconsName}
                            size={18}
                            color={item.categoria_cor || theme.primary}
                          />
                        </View>

                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.itemLixeiraDescricao, { color: theme.text }]} numberOfLines={1}>
                            {item.descricao}
                          </Text>
                          <Text style={[styles.itemLixeiraSubtexto, { color: theme.textSecondary }]}>
                            {item.categoria_nome || 'Sem categoria'} • {dataFormatada}
                            {dataExclusaoFormatada ? ` • Excluído: ${dataExclusaoFormatada}` : ''}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.itemLixeiraValor,
                            { color: ehReceita ? theme.success : theme.danger },
                          ]}
                        >
                          {ehReceita ? '+ ' : '- '}
                          {formatarMoeda(item.valor)}
                        </Text>
                      </View>

                      <View style={styles.itemLixeiraAcoes}>
                        <TouchableOpacity
                          style={[styles.botaoRestaurarItem, { backgroundColor: theme.primaryLight }]}
                          onPress={() => handleRestaurarItemLixeira(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="arrow-undo-outline" size={15} color={theme.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.textoBotaoRestaurar, { color: theme.primary }]}>Restaurar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.botaoExcluirDefinitivo, { backgroundColor: theme.dangerLight }]}
                          onPress={() => handleExcluirDefinitivoItem(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={15} color={theme.danger} style={{ marginRight: 4 }} />
                          <Text style={[styles.textoBotaoExcluirDefinitivo, { color: theme.danger }]}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  telaWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  topoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tituloPagina: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtituloPagina: {
    fontSize: 13,
    marginTop: 2,
  },
  botaoSalvarTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoBotaoSalvarTopo: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerAlteracoesPendentes: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  tituloBannerAlteracoes: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtituloBannerAlteracoes: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  badgeAcaoBanner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  textoBadgeAcaoBanner: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerSalvoSucesso: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  textoBannerSalvoSucesso: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  linhaCabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badgeSalvo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  textoBadgeSalvo: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgePendente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  textoBadgePendente: {
    fontSize: 11,
    fontWeight: '700',
  },
  pontoPendente: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  tituloSecao: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  descricaoSecao: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  linhaInterruptor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divisorInterno: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.12)',
    marginVertical: 14,
  },
  tituloItemConfig: {
    fontSize: 14,
    fontWeight: '700',
  },
  descItemConfig: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  itemLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  circuloIconeItem: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  textoBotaoAcao: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  botaoAcaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  textoBotaoAcaoSecundario: {
    fontWeight: '700',
    fontSize: 14,
  },
  linhaOpcoesTema: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  opcaoTema: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  textoOpcaoTema: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardPrivacidade: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  linhaSelo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circuloSelo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloPrivacidade: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtituloPrivacidade: {
    fontSize: 12,
    marginTop: 2,
  },
  divisor: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: 14,
  },
  itemPrivacidade: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  textoItemPrivacidade: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  cardAlertaBackup: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  topoAlertaBackup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  circuloAlertaBackup: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloAlertaBackup: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  descAlertaBackup: {
    fontSize: 13,
    lineHeight: 18,
  },
  botaoAlertaBackup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  textoBotaoAlertaBackup: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  badgeContagem: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  textoBadgeContagem: {
    fontSize: 11,
    fontWeight: '700',
  },
  gradeFavoritos: {
    gap: 8,
  },
  itemFavoritoConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  circuloIconeFavorito: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomeFavoritoConfig: {
    fontSize: 13,
    fontWeight: '700',
  },
  valorFavoritoConfig: {
    fontSize: 12,
    marginTop: 1,
  },
  botaoExcluirFavorito: {
    padding: 4,
  },
  boxStatusBackup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  textoStatusBackup: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  versaoTexto: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  // Barra Inferior Fixa
  barraInferiorFixa: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  botaoSalvarGrande: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaSalvarInterna: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  textoBotaoSalvarGrande: {
    fontSize: 15,
    fontWeight: '700',
  },
  bolinhaAlerta: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 2,
  },
  // Estilos da Lixeira de Lançamentos
  badgeLixeira: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBadgeLixeira: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalConteudoLixeira: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    minHeight: 350,
    padding: 20,
  },
  modalCabecalhoLixeira: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  modalTituloLixeira: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtituloLixeira: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  botaoFecharModal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barraAcoesLixeira: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    marginBottom: 4,
  },
  botaoEsvaziarLixeira: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoBotaoEsvaziar: {
    fontSize: 12,
    fontWeight: '700',
  },
  centroCarregamentoLixeira: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazioLixeiraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  circuloVazioLixeira: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  textoVazioLixeira: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtextoVazioLixeira: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  itemLixeiraCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  itemLixeiraCorpo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLixeiraIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemLixeiraDescricao: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemLixeiraSubtexto: {
    fontSize: 11,
    marginTop: 2,
  },
  itemLixeiraValor: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemLixeiraAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  botaoRestaurarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  textoBotaoRestaurar: {
    fontSize: 12,
    fontWeight: '700',
  },
  botaoExcluirDefinitivo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  textoBotaoExcluirDefinitivo: {
    fontSize: 12,
    fontWeight: '700',
  },
});
