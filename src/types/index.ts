import { Ionicons } from '@expo/vector-icons';

export type IoniconsName = keyof typeof Ionicons.glyphMap;

export type TipoTransacao = 'receita' | 'despesa';

export type OrigemTransacao = 'manual' | 'importado';

export type TipoGasto = 'essencial' | 'estilo_de_vida' | 'poupanca';

export type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'pagamento_fatura' | 'outro';

export type TipoConta = 'corrente' | 'carteira' | 'poupanca' | 'beneficio';

export interface Conta {
  id: number;
  nome: string;
  tipo: TipoConta;
  saldo_inicial: number;
  cor?: string;
  icone?: string;
  deleted_at?: number | null;
}

export interface Cartao {
  id: number;
  nome: string;
  limite: number;
  dia_vencimento: number;
  dia_fechamento: number;
  conta_pagamento_id?: number;
  cor?: string;
  icone?: string;
  deleted_at?: number | null;
}

export interface Categoria {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  ordem?: number;
  limite_mensal?: number | null; // Teto de orçamento mensal opcional (em R$)
  tipo_gasto?: TipoGasto; // 'essencial' (50%), 'estilo_de_vida' (30%) ou 'poupanca' (20%)
  totalGasto?: number; // Para relatórios e rankings
  contagemTransacoes?: number;
  deleted_at?: number | null;
}

export interface Transacao {
  id: number;
  valor: number;
  tipo: TipoTransacao;
  categoria_id: number;
  data: string; // Formato YYYY-MM-DD
  descricao: string;
  conciliado: number; // 0 = não, 1 = sim
  origem: OrigemTransacao;
  pago?: number; // 1 = pago/realizado, 0 = pendente/a pagar
  parcela_atual?: number | null; // Ex: 1 (de 1/3)
  total_parcelas?: number | null; // Ex: 3
  grupo_parcelamento_id?: string | null; // UUID ou ID comum para identificar o grupo da compra parcelada
  forma_pagamento?: FormaPagamento;
  conta_id?: number | null;
  conta_destino_id?: number | null;
  cartao_id?: number | null;
  fatura_id?: number | null;
  codigo_bancario_hash?: string | null;
  is_transfer?: number;
  anexo_uri?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  // Campos populados via JOIN
  categoria_nome?: string;
  categoria_icone?: string;
  categoria_cor?: string;
  categoria_tipo_gasto?: TipoGasto;
}

export type FaturaStatus = 'aberta' | 'fechada' | 'paga';

export interface FaturaCartao {
  id: number;
  cartao_id: number;
  mes_ano: string; // YYYY-MM
  data_fechamento: string;
  data_vencimento: string;
  valor_total: number;
  status: FaturaStatus;
  deleted_at?: number | null;
}

export interface ProjecaoFluxoMes {
  mesAno: string; // YYYY-MM
  nomeMes: string; // "Outubro 2026"
  receitasEsperadas: number;
  despesasComprometidas: number;
  saldoMesEstimado: number;
  saldoAcumuladoEstimado: number;
}

export interface AnomaliaGasto {
  categoriaId: number;
  categoriaNome: string;
  categoriaIcone?: string;
  categoriaCor?: string;
  valorAtual: number;
  mediaHistorica: number;
  percentualAcima: number;
  diferenca: number;
}

export interface TransacaoExtratoPendente {
  idTemp: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: TipoTransacao;
  categoria_id_sugerida: number;
  jaConciliado: boolean;
  transacaoCorrespondenteId?: number;
  selecionadoParaImportar: boolean;
  hashBancario?: string;
}

export interface ItemExtratoBruto {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number; // Sempre positivo
  tipo: TipoTransacao; // 'receita' ou 'despesa'
  fitId?: string;
}

export type BancoPresetId =
  | 'nubank'
  | 'inter'
  | 'itau'
  | 'bradesco'
  | 'bb'
  | 'caixa'
  | 'c6'
  | 'generico';

export interface BancoPreset {
  id: BancoPresetId;
  nome: string;
  cor: string;
  icone: string;
  descricao: string;
}

export interface ResultadoParseExtrato {
  itens: ItemExtratoBruto[];
  banco: BancoPreset;
  formato: 'OFX' | 'CSV';
}

export interface ImportacaoExtrato {
  id: number;
  nome_arquivo: string;
  data: string;
  quantidade_lancamentos: number;
}

export interface ResumoFinanceiro {
  receitas: number;
  despesas: number;
  saldo: number; // Saldo previsto (final do mês)
  saldoRealizado: number; // Saldo já pago/em conta hoje
  receitasRealizadas: number;
  despesasRealizadas: number;
  receitasPendentes: number;
  despesasPendentes: number;
  contasPendentesQtd: number;
  contasPendentesValor: number;
}

export interface RankingCategoria {
  categoriaId: number;
  nome: string;
  cor: string;
  icone: string;
  tipoGasto?: TipoGasto;
  total: number;
  percentual: number;
  totalMesAnterior?: number;
  variacaoPercentual?: number | null; // ex: +15.5%, -5.2%, ou null se não havia gasto
  limiteMensal?: number | null; // Teto de gastos definido para o mês
  percentualLimite?: number | null; // ex: 85% do limite consumido
  restanteLimite?: number | null; // quanto ainda pode gastar antes de estourar (ou negativo se estourou)
}

export interface ComprometimentoFuturo {
  mesAno: string; // YYYY-MM
  nomeMes: string; // "Outubro 2026"
  totalParcelas: number;
  totalRecorrentes: number;
  totalComprometido: number;
  qtdParcelas: number;
}

export interface AnaliseEssencialVsEstilo {
  totalEssencial: number;
  totalEstiloDeVida: number;
  totalPoupanca: number;
  percentualEssencial: number;
  percentualEstiloDeVida: number;
  percentualPoupanca: number;
}

export interface LancamentoRecorrente {
  id: number;
  valor: number;
  tipo: TipoTransacao;
  categoria_id: number;
  descricao: string;
  dia_vencimento: number;
  ativo: number;
  ultimo_mes_gerado?: string | null;
  categoria_nome?: string;
  categoria_cor?: string;
  categoria_icone?: string;
}

export interface Favorito {
  id: number;
  titulo: string;
  valor: number;
  tipo: TipoTransacao;
  categoria_id: number;
  icone?: string;
  categoria_nome?: string;
  categoria_cor?: string;
  categoria_icone?: string;
}

export interface BackupData {
  versao: number;
  exportadoEm: string;
  categorias: Categoria[];
  transacoes: Transacao[];
  recorrentes?: LancamentoRecorrente[];
  favoritos?: Favorito[];
  configuracoes?: Record<string, string>;
  importacoes?: ImportacaoExtrato[];
}
