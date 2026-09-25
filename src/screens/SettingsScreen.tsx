import React, { useState, useEffect } from 'react';
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

export const SettingsScreen: React.FC = () => {
  const { theme, modo, setModo } = useTheme();
  const {
    backupRepo,
    settingsRepo,
    notificarMudancaDados,
    biometriaHabilitada,
    setBiometriaHabilitada,
    abrirModalRecorrentes,
  } = useApp();

  const [exportando, setExportando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [lembretesAtivos, setLembretesAtivos] = useState(true);

  useEffect(() => {
    (async () => {
      const lemb = await settingsRepo.obterBooleano('lembretes_habilitados', true);
      setLembretesAtivos(lemb);
    })();
  }, [settingsRepo]);

  const handleAlternarBiometria = async (novoValor: boolean) => {
    AppHaptics.toqueLeve();
    if (novoValor) {
      // Confirma autenticação antes de ativar
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometria Indisponível',
          'Seu dispositivo não possui biometria cadastrada. Cadastre uma impressão digital ou reconhecimento facial nas configurações do Android.'
        );
        return;
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua digital para ativar o bloqueio',
        fallbackLabel: 'Usar Senha',
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
          'Permissão Necessária',
          'Ative a permissão de notificações para receber alertas no dia de vencimento das contas.'
        );
        return;
      }
    }
    setLembretesAtivos(novoValor);
    await settingsRepo.definirBooleano('lembretes_habilitados', novoValor);
  };

  const handleExportar = async () => {
    try {
      AppHaptics.toqueLeve();
      setExportando(true);
      await backupRepo.exportarBackup();
      AppHaptics.toqueSucesso();
    } catch (e: any) {
      Alert.alert('Erro no Backup', 'Não foi possível exportar os dados. ' + (e.message || ''));
    } finally {
      setExportando(false);
    }
  };

  const handleRestaurar = async () => {
    Alert.alert(
      'Atenção ao Restaurar',
      'Ao restaurar um arquivo de backup, todos os dados atuais serão substituídos pelos dados do arquivo. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Escolher Arquivo de Backup',
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
              AppHaptics.toqueSucesso();

              Alert.alert(
                'Backup Restaurado!',
                `${stats.categoriasRestauradas} categorias e ${stats.transacoesRestauradas} lançamentos foram recuperados com sucesso.`
              );
            } catch (e: any) {
              Alert.alert('Erro ao Restaurar', 'O arquivo selecionado não é um backup válido.');
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
          Segurança, automações e preferências
        </Text>
      </View>

      {/* Seção Segurança & Biometria */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.tituloSecao, { color: theme.text }]}>Segurança</Text>

        <View style={styles.linhaInterruptor}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
              Bloqueio por Biometria / Digital
            </Text>
            <Text style={[styles.descItemConfig, { color: theme.textSecondary }]}>
              Exige impressão digital ou reconhecimento facial ao abrir o aplicativo
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

      {/* Seção Automações & Lembretes */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.tituloSecao, { color: theme.text }]}>Automações & Lembretes</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.itemLink, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
          onPress={abrirModalRecorrentes}
        >
          <View style={[styles.circuloIconeItem, { backgroundColor: theme.warningLight }]}>
            <Ionicons name="repeat-outline" size={20} color={theme.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
              Contas & Rendas Fixas Mensais
            </Text>
            <Text style={[styles.descItemConfig, { color: theme.textSecondary }]}>
              Salário, aluguel, internet (criados sozinhos todo mês)
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={[styles.linhaInterruptor, { marginTop: 14 }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.tituloItemConfig, { color: theme.text }]}>
              Lembretes de Vencimento
            </Text>
            <Text style={[styles.descItemConfig, { color: theme.textSecondary }]}>
              Notificação local no aparelho às 09:00 no dia do vencimento da conta
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

      {/* Seção Backup e Dados Locais */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.tituloSecao, { color: theme.text }]}>Backup & Dados Locais</Text>
        <Text style={[styles.descricaoSecao, { color: theme.textSecondary }]}>
          Como o aplicativo não usa nuvem por privacidade, salve backups periódicos para não perder seus dados ao trocar de aparelho.
        </Text>

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
              <Text style={styles.textoBotaoAcao}>Gerar e Salvar Arquivo de Backup</Text>
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
                Restaurar Backup do Aparelho
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Seção Aparência */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.tituloSecao, { color: theme.text }]}>Aparência</Text>

        <View style={styles.linhaOpcoesTema}>
          <TouchableOpacity
            style={[
              styles.opcaoTema,
              {
                backgroundColor: modo === 'escuro' ? theme.primaryLight : theme.inputBg,
                borderColor: modo === 'escuro' ? theme.primary : theme.inputBorder,
              },
            ]}
            onPress={() => {
              AppHaptics.toqueSelecao();
              setModo('escuro');
            }}
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
            onPress={() => {
              AppHaptics.toqueSelecao();
              setModo('claro');
            }}
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
            onPress={() => {
              AppHaptics.toqueSelecao();
              setModo('sistema');
            }}
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

      {/* Selo de Garantia e Privacidade */}
      <View style={[styles.cardPrivacidade, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.linhaSelo}>
          <View style={[styles.circuloSelo, { backgroundColor: theme.successLight }]}>
            <Ionicons name="shield-checkmark" size={26} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tituloPrivacidade, { color: theme.text }]}>Privacidade Absoluta</Text>
            <Text style={[styles.subtituloPrivacidade, { color: theme.textSecondary }]}>
              Seu dinheiro é assunto 100% privado.
            </Text>
          </View>
        </View>

        <View style={styles.divisor} />

        <View style={styles.itemPrivacidade}>
          <Ionicons name="wifi-outline" size={18} color={theme.success} />
          <Text style={[styles.textoItemPrivacidade, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.text }}>Sem permissão de internet:</Text> O aplicativo não possui código de rede ou servidores.
          </Text>
        </View>

        <View style={styles.itemPrivacidade}>
          <Ionicons name="hardware-chip-outline" size={18} color={theme.primary} />
          <Text style={[styles.textoItemPrivacidade, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.text }}>Banco Local SQLite:</Text> Todas as transações são gravadas diretamente no seu smartphone.
          </Text>
        </View>

        <View style={styles.itemPrivacidade}>
          <Ionicons name="finger-print" size={18} color={theme.warning} />
          <Text style={[styles.textoItemPrivacidade, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.text }}>Proteção Biométrica:</Text> Digital e reconhecimento facial nativos do Android.
          </Text>
        </View>
      </View>

      <Text style={[styles.versaoTexto, { color: theme.textMuted }]}>
        Finanças Offline • Versão 1.1.0
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
  tituloSecao: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  descricaoSecao: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloPrivacidade: {
    fontSize: 16,
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
  versaoTexto: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 10,
    marginBottom: 20,
  },
});
