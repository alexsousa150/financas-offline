import React, { createContext, useContext, useState, useCallback } from 'react';
import { Transacao, Categoria, TipoTransacao } from '../types';

export interface ModalContextType {
  // Modal de Transação
  modalTransacaoAberto: boolean;
  modalTransacaoTipoInicial: TipoTransacao;
  transacaoParaEdicao: Transacao | null;
  transacaoParaDuplicacao: Transacao | null;
  abrirModalNovoLancamento: (tipoInicial?: TipoTransacao) => void;
  abrirModalEditarLancamento: (transacao: Transacao) => void;
  abrirModalDuplicarLancamento: (transacao: Transacao) => void;
  fecharModalTransacao: () => void;

  // Modal de Categoria
  modalCategoriaAberto: boolean;
  categoriaParaEdicao: Categoria | null;
  abrirModalNovaCategoria: () => void;
  abrirModalEditarCategoria: (categoria: Categoria) => void;
  fecharModalCategoria: () => void;

  // Modal de Recorrentes
  modalRecorrentesAberto: boolean;
  abrirModalRecorrentes: () => void;
  fecharModalRecorrentes: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalTransacaoAberto, setModalTransacaoAberto] = useState(false);
  const [modalTransacaoTipoInicial, setModalTransacaoTipoInicial] = useState<TipoTransacao>('despesa');
  const [transacaoParaEdicao, setTransacaoParaEdicao] = useState<Transacao | null>(null);
  const [transacaoParaDuplicacao, setTransacaoParaDuplicacao] = useState<Transacao | null>(null);

  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [categoriaParaEdicao, setCategoriaParaEdicao] = useState<Categoria | null>(null);

  const [modalRecorrentesAberto, setModalRecorrentesAberto] = useState(false);

  const abrirModalNovoLancamento = useCallback((tipoInicial: TipoTransacao = 'despesa') => {
    setTransacaoParaEdicao(null);
    setTransacaoParaDuplicacao(null);
    setModalTransacaoTipoInicial(tipoInicial);
    setModalTransacaoAberto(true);
  }, []);

  const abrirModalEditarLancamento = useCallback((transacao: Transacao) => {
    setTransacaoParaDuplicacao(null);
    setTransacaoParaEdicao(transacao);
    setModalTransacaoAberto(true);
  }, []);

  const abrirModalDuplicarLancamento = useCallback((transacao: Transacao) => {
    setTransacaoParaEdicao(null);
    setTransacaoParaDuplicacao(transacao);
    setModalTransacaoAberto(true);
  }, []);

  const fecharModalTransacao = useCallback(() => {
    setModalTransacaoAberto(false);
    setTransacaoParaEdicao(null);
    setTransacaoParaDuplicacao(null);
  }, []);

  const abrirModalNovaCategoria = useCallback(() => {
    setCategoriaParaEdicao(null);
    setModalCategoriaAberto(true);
  }, []);

  const abrirModalEditarCategoria = useCallback((categoria: Categoria) => {
    setCategoriaParaEdicao(categoria);
    setModalCategoriaAberto(true);
  }, []);

  const fecharModalCategoria = useCallback(() => {
    setModalCategoriaAberto(false);
    setCategoriaParaEdicao(null);
  }, []);

  const abrirModalRecorrentes = useCallback(() => {
    setModalRecorrentesAberto(true);
  }, []);

  const fecharModalRecorrentes = useCallback(() => {
    setModalRecorrentesAberto(false);
  }, []);

  return (
    <ModalContext.Provider
      value={{
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
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export function useModals(): ModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals deve ser usado dentro de um ModalProvider');
  }
  return context;
}
