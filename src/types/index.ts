export type TipoTransacao = 'receita' | 'despesa';

export type OrigemTransacao = 'manual' | 'importado';

export interface Categoria {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  ordem?: number;
  limite_mensal?: number | null; // Teto de orçamento mensal opcional (em R$)
  totalGasto?: number; // Para relatórios e rankings
  contagemTransacoes?: number;
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
  parcela_atual?: number | null; // Ex: 1 (de 1/3)
  total_parcelas?: number | null; // Ex: 3
  grupo_parcelamento_id?: string | null; // UUID ou ID comum para identificar o grupo da compra parcelada
  created_at?: string;
  // Campos populados via JOIN
  categoria_nome?: string;
  categoria_icone?: string;
  categoria_cor?: string;
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
  saldo: number;
}

export interface RankingCategoria {
  categoriaId: number;
  nome: string;
  cor: string;
  icone: string;
  total: number;
  percentual: number;
  totalMesAnterior?: number;
  variacaoPercentual?: number | null; // ex: +15.5%, -5.2%, ou null se não havia gasto
  limiteMensal?: number | null; // Teto de gastos definido para o mês
  percentualLimite?: number | null; // ex: 85% do limite consumido
  restanteLimite?: number | null; // quanto ainda pode gastar antes de estourar (ou negativo se estourou)
}

export interface BackupData {
  versao: number;
  exportadoEm: string;
  categorias: Categoria[];
  transacoes: Transacao[];
  importacoes?: ImportacaoExtrato[];
}
