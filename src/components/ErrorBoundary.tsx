import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  mostrarDetalhes: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      mostrarDetalhes: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary capturou uma falha não tratada:', error, errorInfo);
  }

  handleTentarNovamente = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      mostrarDetalhes: false,
    });
  };

  alternarDetalhes = () => {
    this.setState((prev) => ({ mostrarDetalhes: !prev.mostrarDetalhes }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, mostrarDetalhes } = this.state;

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.circuloIcone}>
                <Ionicons name="shield-outline" size={48} color="#EF4444" />
                <View style={styles.badgeAlerta}>
                  <Ionicons name="alert" size={16} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.titulo}>Ops! Algo deu errado</Text>
              <Text style={styles.subtitulo}>
                Ocorreu uma falha inesperada na tela. Seus dados financeiros continuam 100% seguros e gravados localmente no seu dispositivo.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.botaoRecuperar}
                onPress={this.handleTentarNovamente}
              >
                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.textoBotaoRecuperar}>Tentar novamente</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.botaoDetalhes}
                onPress={this.alternarDetalhes}
              >
                <Ionicons
                  name={mostrarDetalhes ? 'chevron-up-outline' : 'code-slash-outline'}
                  size={16}
                  color="#A1A1AA"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.textoBotaoDetalhes}>
                  {mostrarDetalhes ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
                </Text>
              </TouchableOpacity>

              {mostrarDetalhes && (
                <View style={styles.caixaDetalhes}>
                  <Text style={styles.rotuloErro}>Mensagem do erro:</Text>
                  <Text style={styles.textoErro}>{error?.toString() || 'Erro desconhecido'}</Text>

                  {errorInfo?.componentStack && (
                    <>
                      <Text style={[styles.rotuloErro, { marginTop: 10 }]}>Pilha do componente:</Text>
                      <Text style={styles.textoStack}>{errorInfo.componentStack.trim()}</Text>
                    </>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1A1A1E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 24,
    alignItems: 'center',
  },
  circuloIcone: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  badgeAlerta: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A1A1E',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F4F4F5',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitulo: {
    fontSize: 14,
    lineHeight: 21,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 24,
  },
  botaoRecuperar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
  },
  textoBotaoRecuperar: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  botaoDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  textoBotaoDetalhes: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  caixaDetalhes: {
    width: '100%',
    backgroundColor: '#09090B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 12,
    marginTop: 10,
  },
  rotuloErro: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  textoErro: {
    color: '#F4F4F5',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  textoStack: {
    color: '#71717A',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});
