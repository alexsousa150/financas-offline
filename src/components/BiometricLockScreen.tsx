import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../context/ThemeContext';
import { AppHaptics } from '../utils/haptics';

interface BiometricLockScreenProps {
  onAutenticado: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onAutenticado }) => {
  const { theme } = useTheme();
  const [autenticando, setAutenticando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const tentarAutenticar = async () => {
    try {
      setAutenticando(true);
      setMensagemErro(null);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Se o aparelho não tem digital cadastrada, libera o acesso
        onAutenticado();
        return;
      }

      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloqueie o Finanças Offline',
        fallbackLabel: 'Usar Senha do Aparelho',
        disableDeviceFallback: false,
        cancelLabel: 'Cancelar',
      });

      if (resultado.success) {
        AppHaptics.toqueSucesso();
        onAutenticado();
      } else {
        AppHaptics.toqueAviso();
        setMensagemErro('Autenticação não realizada. Toque no botão para tentar novamente.');
      }
    } catch (e: any) {
      setMensagemErro('Erro ao verificar biometria.');
    } finally {
      setAutenticando(false);
    }
  };

  useEffect(() => {
    tentarAutenticar();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.conteudoCentro}>
        <View style={[styles.circuloIcone, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
          <Ionicons name="finger-print" size={54} color={theme.primary} />
        </View>

        <Text style={[styles.titulo, { color: theme.text }]}>Finanças Offline</Text>
        <Text style={[styles.subtitulo, { color: theme.textSecondary }]}>
          Seus dados estão protegidos por biometria
        </Text>

        {mensagemErro && (
          <Text style={[styles.textoErro, { color: theme.danger }]}>
            {mensagemErro}
          </Text>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.botaoDesbloquear, { backgroundColor: theme.primary }]}
          onPress={tentarAutenticar}
          disabled={autenticando}
        >
          {autenticando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.textoBotao}>Desbloquear com Biometria</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  conteudoCentro: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  circuloIcone: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  textoErro: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  botaoDesbloquear: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    marginTop: 10,
  },
  textoBotao: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
