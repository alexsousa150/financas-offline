import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { BackupData } from '../types';

export const SettingsScreen: React.FC = () => {
  const { theme, modo, setModo } = useTheme();
  const { backupRepo, notificarMudancaDados } = useApp();

  const [exportando, setExportando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  const handleExportar = async () => {
    try {
      setExportando(true);
      await backupRepo.exportarBackup();
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
          Backup local e preferências
        </Text>
      </View>

      {/* Seção Backup e Segurança */}
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

      {/* Seção Tema */}
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
            onPress={() => setModo('escuro')}
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
            onPress={() => setModo('claro')}
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
            onPress={() => setModo('sistema')}
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
            <Text style={[styles.tituloPrivacidade, { color: theme.text }]}>Privacidade Garantida</Text>
            <Text style={[styles.subtituloPrivacidade, { color: theme.textSecondary }]}>
              Seu dinheiro é assunto apenas seu.
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
            <Text style={{ fontWeight: '700', color: theme.text }}>Banco Local SQLite:</Text> Todas as transações são gravadas diretamente no armazenamento do celular.
          </Text>
        </View>

        <View style={styles.itemPrivacidade}>
          <Ionicons name="eye-off-outline" size={18} color={theme.warning} />
          <Text style={[styles.textoItemPrivacidade, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: theme.text }}>Zero Rastreamento:</Text> Sem anúncios, sem telemetria, sem compartilhamento com terceiros.
          </Text>
        </View>
      </View>

      <Text style={[styles.versaoTexto, { color: theme.textMuted }]}>
        Finanças Offline • Versão 1.0.0
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
    marginBottom: 6,
  },
  descricaoSecao: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
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
    marginTop: 10,
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
