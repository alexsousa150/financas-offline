import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { BackupData } from '../types';
import { NotificationService } from '../services/notificationService';
import { AppHaptics } from '../utils/haptics';
import { APP_VERSION, APP_BUILD } from '../utils/version';
import { formatarMoeda } from '../utils/formatters';

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
    abrirModalRecorrentes,
  } = useApp();

  const [exportando, setExportando] = useState(false);
  const [exportandoCsv, setExportandoCsv] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [lembretesAtivos, setLembretesAtivos] = useState(true);
  const [contasFixasQtd, setContasFixasQtd] = useState(0);
  const [totalFixasMensal, setTotalFixasMensal] = useState(0);
  const [feedbackTemaSalvo, setFeedbackTemaSalvo] = useState(false);

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

  useEffect(() => {
    (async () => {
      const lemb = await settingsRepo.obterBooleano('lembretes_habilitados', true);
      setLembretesAtivos(lemb);
      await Promise.all([
        carregarResumoContasFixas(),
        carregarStatusBackup(),
        carregarFavoritos(),
      ]);
    })();
  }, [settingsRepo, carregarResumoContasFixas, carregarStatusBackup, carregarFavoritos]);

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
        return;
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua biometria para ativar o bloqueio',
        fallbackLabel: 'Usar senha',
      });

      if (res.success) {
        AppHaptics.toqueSucesso();
        await setBiometriaHabilitada(true);
      } else {
        AppHaptics.toqueAviso();
      }
    } else {
      await setBiometriaHabilitada(false);
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
        return;
      }
    }
    setLembretesAtivos(novoValor);
    await settingsRepo.definirBooleano('lembretes_habilitados', novoValor);
  };

  const handleSelecionarTema = async (novoModo: 'escuro' | 'claro' | 'sistema') => {
    AppHaptics.toqueSelecao();
    await setModo(novoModo);
    setFeedbackTemaSalvo(true);
    setTimeout(() => {
      setFeedbackTemaSalvo(false);
    }, 2500);
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
    } catch (e: any) {
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
            } catch (e) {
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
            } catch (e) {
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
            } catch (e: any) {
              Alert.alert('Erro ao restaurar', 'O arquivo selecionado não é um backup válido.');
            } finally {
              setRestaurando(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topoContainer}>
        <Text style={[styles.tituloPagina, { color: theme.text }]}>Configurações</Text>
        <Text style={[styles.subtituloPagina, { color: theme.textSecondary }]}>
          Preferências, segurança e armazenamento local
        </Text>
      </View>

      {/* Banner de Aviso de Backup Periódico */}
      {statusBackup.precisaBackup && (
        <View style={[styles.cardAlertaBackup, { backgroundColor: theme.warningLight, borderColor: theme.warning }]}>
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
            <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
              Lembretes de vencimento
            </Text>
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
          Gastos frequentes do dia a dia prontos para registro instantâneo com 1 toque no botão de novo lançamento (+) ou ao segurar o ícone do aplicativo na tela inicial do celular.
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
                  name={(fav.icone || fav.categoria_icone || 'pricetag-outline') as any}
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

      {/* Seção Aparência */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.linhaCabecalhoSecao}>
          <Text style={[styles.tituloSecao, { color: theme.text, marginBottom: 0 }]}>Aparência</Text>
          {feedbackTemaSalvo ? (
            <View style={[styles.badgeSalvo, { backgroundColor: theme.successLight }]}>
              <Ionicons name="checkmark-circle" size={13} color={theme.success} />
              <Text style={[styles.textoBadgeSalvo, { color: theme.success }]}>Salvo</Text>
            </View>
          ) : (
            <Text style={[styles.textoStatusTema, { color: theme.textMuted }]}>Salvo neste aparelho</Text>
          )}
        </View>
        <Text style={[styles.descricaoSecao, { color: theme.textSecondary, marginTop: 4, marginBottom: 12 }]}>
          Escolha o tema visual do aplicativo. Sua preferência fica gravada no banco local e se mantém ao reiniciar.
        </Text>

        <View style={styles.linhaOpcoesTema}>
          <TouchableOpacity
            style={[
              styles.opcaoTema,
              {
                backgroundColor: modo === 'escuro' ? theme.primaryLight : theme.inputBg,
                borderColor: modo === 'escuro' ? theme.primary : theme.inputBorder,
              },
            ]}
            onPress={() => handleSelecionarTema('escuro')}
          >
            <Ionicons
              name="moon"
              size={20}
              color={modo === 'escuro' ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.textoOpcaoTema,
                { color: modo === 'escuro' ? theme.primary : theme.text },
              ]}
            >
              Escuro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.opcaoTema,
              {
                backgroundColor: modo === 'claro' ? theme.primaryLight : theme.inputBg,
                borderColor: modo === 'claro' ? theme.primary : theme.inputBorder,
              },
            ]}
            onPress={() => handleSelecionarTema('claro')}
          >
            <Ionicons
              name="sunny"
              size={20}
              color={modo === 'claro' ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.textoOpcaoTema,
                { color: modo === 'claro' ? theme.primary : theme.text },
              ]}
            >
              Claro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.opcaoTema,
              {
                backgroundColor: modo === 'sistema' ? theme.primaryLight : theme.inputBg,
                borderColor: modo === 'sistema' ? theme.primary : theme.inputBorder,
              },
            ]}
            onPress={() => handleSelecionarTema('sistema')}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={modo === 'sistema' ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.textoOpcaoTema,
                { color: modo === 'sistema' ? theme.primary : theme.text },
              ]}
            >
              Sistema
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seção Segurança */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.tituloSecao, { color: theme.text }]}>Segurança</Text>

        <View style={styles.linhaInterruptor}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
              Bloqueio por biometria
            </Text>
            <Text style={[styles.descItemConfig, { color: theme.textSecondary }]}>
              Solicita impressão digital ou reconhecimento facial ao abrir o aplicativo
            </Text>
          </View>
          <Switch
            value={biometriaHabilitada}
            onValueChange={handleAlternarBiometria}
            thumbColor={biometriaHabilitada ? theme.primary : '#A1A1AA'}
            trackColor={{ false: '#71717A', true: theme.primaryLight }}
          />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  topoContainer: {
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
  textoStatusTema: {
    fontSize: 11,
    fontWeight: '500',
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
});
