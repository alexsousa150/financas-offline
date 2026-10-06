import { SQLiteDatabase } from 'expo-sqlite';
import {
  Transacao,
  TipoTransacao,
  ResumoFinanceiro,
  RankingCategoria,
  ComprometimentoFuturo,
  TetoDiarioInfo,
  AnaliseEssencialVsEstilo,
  FormaPagamento,
  ProjecaoFluxoMes,
  AnomaliaGasto,
} from '../types';
import {
  getMesAnterior,
  getNomeMesAno,
  getIntervaloMes,
  getIntervaloAno,
  subtrairMoeda,
  somarMoeda,
  reaisParaCentavos,
  centavosParaReais,
} from '../utils/formatters';

export interface FiltrosTransacao {
  mesAno?: string; // Formato YYYY-MM
  tipo?: TipoTransacao;
  categoriaId?: number;
  pago?: number; // 0 = pendente, 1 = pago
  busca?: string;
  limite?: number;
  offset?: number;
  formaPagamento?: FormaPagamento;
}

export class TransactionsRepository {
  constructor(private db: SQLiteDatabase) {}

  async listar(filtros: FiltrosTransacao = {}): Promise<Transacao[]> {
    let sql = `
      SELECT 
        t.id,
        t.valor,
        t.tipo,
        t.categoria_id,
        t.data,
        t.descricao,
        t.conciliado,
        t.origem,
        t.pago,
        t.parcela_atual,
        t.total_parcelas,
        t.grupo_parcelamento_id,
        t.forma_pagamento,
        t.deleted_at,
        t.created_at,
        c.nome as categoria_nome,
        c.icone as categoria_icone,
        c.cor as categoria_cor,
        c.tipo_gasto as categoria_tipo_gasto
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (filtros.mesAno) {
      const { inicio, fimExclusivo } = getIntervaloMes(filtros.mesAno);
      sql += ` AND t.data >= ? AND t.data < ?`;
      params.push(inicio, fimExclusivo);
    }

    if (filtros.tipo) {
      sql += ` AND t.tipo = ?`;
      params.push(filtros.tipo);
    }

    if (filtros.categoriaId) {
      sql += ` AND t.categoria_id = ?`;
      params.push(filtros.categoriaId);
    }

    if (filtros.pago !== undefined) {
      sql += ` AND t.pago = ?`;
      params.push(filtros.pago);
    }

    if (filtros.busca && filtros.busca.trim()) {
      sql += ` AND (LOWER(t.descricao) LIKE ? OR LOWER(c.nome) LIKE ?)`;
      const termo = `%${filtros.busca.trim().toLowerCase()}%`;
      params.push(termo, termo);
    }

    if (filtros.formaPagamento) {
      sql += ` AND t.forma_pagamento = ?`;
      params.push(filtros.formaPagamento);
    }

    sql += ` ORDER BY t.data DESC, t.id DESC`;

    if (filtros.limite && filtros.limite > 0) {
      sql += ` LIMIT ?`;
      params.push(filtros.limite);
      if (filtros.offset && filtros.offset > 0) {
        sql += ` OFFSET ?`;
        params.push(filtros.offset);
      }
    }

    return await this.db.getAllAsync<Transacao>(sql, ...params);
  }

  async obterPorId(id: number): Promise<Transacao | null> {
    const sql = `
      SELECT 
        t.id,
        t.valor,
        t.tipo,
        t.categoria_id,
        t.data,
        t.descricao,
        t.conciliado,
        t.origem,
        t.pago,
        t.parcela_atual,
        t.total_parcelas,
        t.grupo_parcelamento_id,
        t.forma_pagamento,
        t.deleted_at,
        t.created_at,
        c.nome as categoria_nome,
        c.icone as categoria_icone,
        c.cor as categoria_cor,
        c.tipo_gasto as categoria_tipo_gasto
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.id = ? AND t.deleted_at IS NULL;
    `;
    const row = await this.db.getFirstAsync<Transacao>(sql, id);
    return row || null;
  }

  async criar(transacao: Omit<Transacao, 'id'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO transacoes (valor, tipo, categoria_id, conta_id, cartao_id, data, descricao, conciliado, origem, pago, parcela_atual, total_parcelas, grupo_parcelamento_id, forma_pagamento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      transacao.valor,
      transacao.tipo,
      transacao.categoria_id,
      transacao.conta_id ?? null,
      transacao.cartao_id ?? null,
      transacao.data,
      transacao.descricao || '',
      transacao.conciliado ? 1 : 0,
      transacao.origem || 'manual',
      transacao.pago !== undefined ? (transacao.pago ? 1 : 0) : 1,
      transacao.parcela_atual ?? null,
      transacao.total_parcelas ?? null,
      transacao.grupo_parcelamento_id ?? null,
      transacao.forma_pagamento || 'outro'
    );
    return Number(result.lastInsertRowId);
  }

  /**
   * Cria uma compra parcelada em N vezes, distribuindo as parcelas mês a mês.
   * A 1ª parcela pode ser paga ou pendente; as seguintes (p > 1) nascem pendentes (pago = 0).
   */
  async criarParcelado(
    transacaoBase: Omit<Transacao, 'id'>,
    numeroParcelas: number,
    valorTotal: number
  ): Promise<number[]> {
    if (numeroParcelas <= 1) {
      const id = await this.criar({ ...transacaoBase, valor: valorTotal });
      return [id];
    }

    const totalCentavos = reaisParaCentavos(valorTotal);
    const parcelaBaseCentavos = Math.floor(totalCentavos / numeroParcelas);
    const diferencaCentavos = totalCentavos - (parcelaBaseCentavos * numeroParcelas);
    const primeiraParcelaCentavos = parcelaBaseCentavos + diferencaCentavos;

    const valorParcelaBase = centavosParaReais(parcelaBaseCentavos);
    const primeiraParcelaValor = centavosParaReais(primeiraParcelaCentavos);

    const grupoId = `parc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const idsCriados: number[] = [];

    const [anoStr, mesStr, diaStr] = transacaoBase.data.split('-');
    let anoAtual = parseInt(anoStr, 10);
    let mesAtual = parseInt(mesStr, 10);
    const diaOriginal = parseInt(diaStr, 10);

    const descricaoBase = transacaoBase.descricao ? transacaoBase.descricao.trim() : 'Compra Parcelada';

    await this.db.withTransactionAsync(async () => {
      for (let p = 1; p <= numeroParcelas; p++) {
        let anoParcela = anoAtual;
        let mesParcela = mesAtual + (p - 1);
        while (mesParcela > 12) {
          mesParcela -= 12;
          anoParcela += 1;
        }

        const ultimoDiaDoMes = new Date(anoParcela, mesParcela, 0).getDate();
        const diaParcela = Math.min(diaOriginal, ultimoDiaDoMes);

        const dataParcelaIso = `${anoParcela}-${String(mesParcela).padStart(2, '0')}-${String(diaParcela).padStart(2, '0')}`;
        const valorDestaParcela = p === 1 ? primeiraParcelaValor : valorParcelaBase;
        const descricaoComParcela = `${descricaoBase} (${p}/${numeroParcelas})`;
        // A 1ª parcela respeita o status escolhido (ou pago); parcelas futuras nascem pendentes
        const statusPago = p === 1 ? (transacaoBase.pago !== undefined ? (transacaoBase.pago ? 1 : 0) : 1) : 0;

        const result = await this.db.runAsync(
          `INSERT INTO transacoes (valor, tipo, categoria_id, conta_id, cartao_id, data, descricao, conciliado, origem, pago, parcela_atual, total_parcelas, grupo_parcelamento_id, forma_pagamento)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          valorDestaParcela,
          transacaoBase.tipo,
          transacaoBase.categoria_id,
          transacaoBase.conta_id ?? null,
          transacaoBase.cartao_id ?? null,
          dataParcelaIso,
          descricaoComParcela,
          0,
          transacaoBase.origem || 'manual',
          statusPago,
          p,
          numeroParcelas,
          grupoId,
          transacaoBase.forma_pagamento || 'cartao_credito'
        );

        idsCriados.push(Number(result.lastInsertRowId));
      }
    });

    return idsCriados;
  }

  async atualizar(id: number, transacao: Partial<Transacao>): Promise<void> {
    const campos: string[] = [];
    const params: any[] = [];

    if (transacao.valor !== undefined) {
      campos.push('valor = ?');
      params.push(transacao.valor);
    }
    if (transacao.tipo !== undefined) {
      campos.push('tipo = ?');
      params.push(transacao.tipo);
    }
    if (transacao.categoria_id !== undefined) {
      campos.push('categoria_id = ?');
      params.push(transacao.categoria_id);
    }
    if (transacao.conta_id !== undefined) {
      campos.push('conta_id = ?');
      params.push(transacao.conta_id);
    }
    if (transacao.cartao_id !== undefined) {
      campos.push('cartao_id = ?');
      params.push(transacao.cartao_id);
    }
    if (transacao.data !== undefined) {
      campos.push('data = ?');
      params.push(transacao.data);
    }
    if (transacao.descricao !== undefined) {
      campos.push('descricao = ?');
      params.push(transacao.descricao);
    }
    if (transacao.conciliado !== undefined) {
      campos.push('conciliado = ?');
      params.push(transacao.conciliado ? 1 : 0);
    }
    if (transacao.origem !== undefined) {
      campos.push('origem = ?');
      params.push(transacao.origem);
    }
    if (transacao.pago !== undefined) {
      campos.push('pago = ?');
      params.push(transacao.pago ? 1 : 0);
    }
    if (transacao.parcela_atual !== undefined) {
      campos.push('parcela_atual = ?');
      params.push(transacao.parcela_atual);
    }
    if (transacao.total_parcelas !== undefined) {
      campos.push('total_parcelas = ?');
      params.push(transacao.total_parcelas);
    }
    if (transacao.grupo_parcelamento_id !== undefined) {
      campos.push('grupo_parcelamento_id = ?');
      params.push(transacao.grupo_parcelamento_id);
    }
    if (transacao.forma_pagamento !== undefined) {
      campos.push('forma_pagamento = ?');
      params.push(transacao.forma_pagamento);
    }

    if (campos.length === 0) return;

    params.push(id);
    const sql = `UPDATE transacoes SET ${campos.join(', ')} WHERE id = ?;`;
    await this.db.runAsync(sql, ...params);
  }

  /**
   * Alterna rapidamente entre Pago (1) e Pendente (0) com 1 toque
   */
  async alternarStatusPago(id: number, novoStatus: number): Promise<void> {
    await this.db.runAsync('UPDATE transacoes SET pago = ? WHERE id = ?;', novoStatus ? 1 : 0, id);
  }

  async excluir(id: number, excluirTodasDoGrupo: boolean = false): Promise<void> {
    if (excluirTodasDoGrupo) {
      const transacao = await this.obterPorId(id);
      if (transacao && transacao.grupo_parcelamento_id) {
        await this.db.runAsync(
          "UPDATE transacoes SET deleted_at = strftime('%s', 'now') WHERE grupo_parcelamento_id = ? AND deleted_at IS NULL;",
          transacao.grupo_parcelamento_id
        );
        return;
      }
    }

    await this.db.runAsync("UPDATE transacoes SET deleted_at = strftime('%s', 'now') WHERE id = ?;", id);
  }

  /**
   * Lista itens atualmente na lixeira (soft-deleted), ordenados pela data de exclusão
   */
  async listarLixeira(): Promise<Transacao[]> {
    const sql = `
      SELECT 
        t.id,
        t.valor,
        t.tipo,
        t.categoria_id,
        t.data,
        t.descricao,
        t.conciliado,
        t.origem,
        t.pago,
        t.parcela_atual,
        t.total_parcelas,
        t.grupo_parcelamento_id,
        t.forma_pagamento,
        t.deleted_at,
        t.created_at,
        c.nome as categoria_nome,
        c.icone as categoria_icone,
        c.cor as categoria_cor,
        c.tipo_gasto as categoria_tipo_gasto
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.deleted_at IS NOT NULL
      ORDER BY t.deleted_at DESC;
    `;
    return await this.db.getAllAsync<Transacao>(sql);
  }

  /**
   * Restaura uma transação excluída (ou todo o grupo de parcelamento)
   */
  async restaurar(id: number, restaurarTodasDoGrupo: boolean = false): Promise<void> {
    if (restaurarTodasDoGrupo) {
      const transacao = await this.db.getFirstAsync<Transacao>(
        'SELECT grupo_parcelamento_id FROM transacoes WHERE id = ?;',
        id
      );
      if (transacao && transacao.grupo_parcelamento_id) {
        await this.db.runAsync(
          'UPDATE transacoes SET deleted_at = NULL WHERE grupo_parcelamento_id = ?;',
          transacao.grupo_parcelamento_id
        );
        return;
      }
    }

    await this.db.runAsync('UPDATE transacoes SET deleted_at = NULL WHERE id = ?;', id);
  }

  /**
   * Esvazia permanentemente todos os itens da lixeira
   */
  async esvaziarLixeira(): Promise<number> {
    const result = await this.db.runAsync('DELETE FROM transacoes WHERE deleted_at IS NOT NULL;');
    return result.changes;
  }

  /**
   * Exclusão permanente de um item específico da lixeira
   */
  async excluirDefinitivo(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM transacoes WHERE id = ?;', id);
  }

  /**
   * Remove permanentemente itens apagados há mais de N dias (padrão 30 dias)
   */
  async expurgarLixeiraAntiga(dias: number = 30): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - dias);
    const limiteIso = dataLimite.toISOString();
    const result = await this.db.runAsync('DELETE FROM transacoes WHERE deleted_at IS NOT NULL AND deleted_at < ?;', limiteIso);
    return result.changes;
  }

  async duplicar(id: number, novaData?: string): Promise<number> {
    const original = await this.obterPorId(id);
    if (!original) throw new Error('Transação não encontrada');

    return await this.criar({
      valor: original.valor,
      tipo: original.tipo,
      categoria_id: original.categoria_id,
      data: novaData || original.data,
      descricao: original.descricao ? `${original.descricao} (Cópia)` : '',
      conciliado: 0,
      origem: 'manual',
      pago: original.pago ?? 1,
    });
  }

  async inserirEmLote(transacoes: Omit<Transacao, 'id'>[]): Promise<number> {
    if (transacoes.length === 0) return 0;

    let totalInseridos = 0;
    await this.db.withTransactionAsync(async () => {
      for (const t of transacoes) {
        await this.db.runAsync(
          `INSERT INTO transacoes (valor, tipo, categoria_id, conta_id, cartao_id, data, descricao, conciliado, origem, pago, parcela_atual, total_parcelas, grupo_parcelamento_id, forma_pagamento, codigo_bancario_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          t.valor,
          t.tipo,
          t.categoria_id,
          t.conta_id ?? null,
          t.cartao_id ?? null,
          t.data,
          t.descricao || '',
          t.conciliado ? 1 : 0,
          t.origem || 'importado',
          t.pago !== undefined ? (t.pago ? 1 : 0) : 1,
          t.parcela_atual ?? null,
          t.total_parcelas ?? null,
          t.grupo_parcelamento_id ?? null,
          t.forma_pagamento || 'outro',
          t.codigo_bancario_hash ?? null
        );
        totalInseridos++;
      }
    });

    return totalInseridos;
  }

  /**
   * Resumo Financeiro Completo com visão dupla: Saldo Realizado (em conta hoje) vs Saldo Previsto (fim do mês).
   * Otimizado em 1 única query atômica com CASE WHEN e index scan em 'data'.
   */
  async obterResumoMes(mesAno: string): Promise<ResumoFinanceiro> {
    const { inicio, fimExclusivo } = getIntervaloMes(mesAno);

    const consolidado = await this.db.getFirstAsync<{
      receitas: number | null;
      despesas: number | null;
      receitasRealizadas: number | null;
      despesasRealizadas: number | null;
      receitasPendentes: number | null;
      despesasPendentes: number | null;
      contasPendentesQtd: number | null;
    }>(
      `SELECT 
         SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
         SUM(CASE WHEN tipo = 'despesa' AND COALESCE(is_transfer, 0) = 0 THEN valor ELSE 0 END) as despesas,
         SUM(CASE WHEN tipo = 'receita' AND pago = 1 THEN valor ELSE 0 END) as receitasRealizadas,
         SUM(CASE WHEN tipo = 'despesa' AND pago = 1 AND cartao_id IS NULL AND COALESCE(is_transfer, 0) = 0 THEN valor ELSE 0 END) as despesasRealizadas,
         SUM(CASE WHEN tipo = 'receita' AND pago = 0 THEN valor ELSE 0 END) as receitasPendentes,
         SUM(CASE WHEN tipo = 'despesa' AND pago = 0 AND COALESCE(is_transfer, 0) = 0 THEN valor ELSE 0 END) as despesasPendentes,
         COUNT(CASE WHEN tipo = 'despesa' AND pago = 0 AND COALESCE(is_transfer, 0) = 0 THEN 1 END) as contasPendentesQtd
       FROM transacoes 
       WHERE data >= ? AND data < ? AND deleted_at IS NULL;`,
      inicio,
      fimExclusivo
    );

    const receitas = Math.round((consolidado?.receitas || 0) * 100) / 100;
    const despesas = Math.round((consolidado?.despesas || 0) * 100) / 100;
    const saldo = subtrairMoeda(receitas, despesas);

    const receitasRealizadas = Math.round((consolidado?.receitasRealizadas || 0) * 100) / 100;
    const despesasRealizadas = Math.round((consolidado?.despesasRealizadas || 0) * 100) / 100;
    const saldoRealizado = subtrairMoeda(receitasRealizadas, despesasRealizadas);

    const despesasPendentes = Math.round((consolidado?.despesasPendentes || 0) * 100) / 100;
    const contasPendentesQtd = consolidado?.contasPendentesQtd || 0;
    const receitasPendentes = Math.round((consolidado?.receitasPendentes || 0) * 100) / 100;

    return {
      receitas,
      despesas,
      saldo,
      saldoRealizado,
      receitasRealizadas,
      despesasRealizadas,
      receitasPendentes,
      despesasPendentes,
      contasPendentesQtd,
      contasPendentesValor: despesasPendentes,
    };
  }

  /**
   * Resumo Anual consolidado para visão macro e evolução patrimonial.
   * Otimizado em 1 única query indexada por intervalo de datas.
   */
  async obterResumoAno(ano: number): Promise<{
    receitas: number;
    despesas: number;
    saldo: number;
    taxaEconomia: number;
    mesesComDados: number;
  }> {
    const { inicio, fimExclusivo } = getIntervaloAno(ano);

    const consolidado = await this.db.getFirstAsync<{
      receitas: number | null;
      despesas: number | null;
      meses: number | null;
    }>(
      `SELECT 
         SUM(CASE WHEN tipo = 'receita' AND pago = 1 THEN valor ELSE 0 END) as receitas,
         SUM(CASE WHEN tipo = 'despesa' AND pago = 1 AND COALESCE(is_transfer, 0) = 0 THEN valor ELSE 0 END) as despesas,
         COUNT(DISTINCT substr(data, 1, 7)) as meses
       FROM transacoes 
       WHERE data >= ? AND data < ? AND deleted_at IS NULL;`,
      inicio,
      fimExclusivo
    );

    const receitas = Math.round((consolidado?.receitas || 0) * 100) / 100;
    const despesas = Math.round((consolidado?.despesas || 0) * 100) / 100;
    const saldo = subtrairMoeda(receitas, despesas);
    const taxaEconomia = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;

    return {
      receitas,
      despesas,
      saldo,
      taxaEconomia: Math.round(taxaEconomia * 10) / 10,
      mesesComDados: consolidado?.meses || 0,
    };
  }

  /**
   * Ranking detalhado das categorias incluindo limites de gastos mensais e tipo de gasto
   */
  async obterRankingCategorias(mesAno: string, tipo: TipoTransacao = 'despesa'): Promise<RankingCategoria[]> {
    const mesAnterior = getMesAnterior(mesAno);
    const { inicio: inicioAtual, fimExclusivo: fimAtual } = getIntervaloMes(mesAno);
    const { inicio: inicioAnt, fimExclusivo: fimAnt } = getIntervaloMes(mesAnterior);

    const totalPeriodoResult = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE data >= ? AND data < ? AND tipo = ? AND deleted_at IS NULL;`,
      inicioAtual,
      fimAtual,
      tipo
    );
    const totalPeriodo = totalPeriodoResult?.total || 0;

    const gastosAtuais = await this.db.getAllAsync<{
      categoria_id: number;
      nome: string;
      cor: string;
      icone: string;
      limite_mensal: number | null;
      tipo_gasto: any;
      total: number;
    }>(
      `SELECT 
         c.id as categoria_id,
         c.nome,
         c.cor,
         c.icone,
         c.limite_mensal,
         c.tipo_gasto,
         SUM(t.valor) as total
       FROM transacoes t
       INNER JOIN categorias c ON t.categoria_id = c.id
       WHERE t.data >= ? AND t.data < ? AND t.tipo = ? AND t.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY total DESC;`,
      inicioAtual,
      fimAtual,
      tipo
    );

    const gastosAnteriores = await this.db.getAllAsync<{
      categoria_id: number;
      total: number;
    }>(
      `SELECT 
         categoria_id,
         SUM(valor) as total
       FROM transacoes
       WHERE data >= ? AND data < ? AND tipo = ? AND deleted_at IS NULL
       GROUP BY categoria_id;`,
      inicioAnt,
      fimAnt,
      tipo
    );

    const mapaAnterior = new Map<number, number>();
    for (const g of gastosAnteriores) {
      mapaAnterior.set(g.categoria_id, g.total);
    }

    return gastosAtuais.map((item) => {
      const percentual = totalPeriodo > 0 ? (item.total / totalPeriodo) * 100 : 0;
      const totalAnt = mapaAnterior.get(item.categoria_id) || 0;

      let variacaoPercentual: number | null = null;
      if (totalAnt > 0) {
        variacaoPercentual = ((item.total - totalAnt) / totalAnt) * 100;
      }

      const limiteMensal = item.limite_mensal;
      let percentualLimite: number | null = null;
      let restanteLimite: number | null = null;

      if (limiteMensal && limiteMensal > 0) {
        percentualLimite = (item.total / limiteMensal) * 100;
        restanteLimite = Math.round((limiteMensal - item.total) * 100) / 100;
      }

      return {
        categoriaId: item.categoria_id,
        nome: item.nome,
        cor: item.cor,
        icone: item.icone,
        tipoGasto: item.tipo_gasto || 'essencial',
        total: Math.round(item.total * 100) / 100,
        percentual,
        totalMesAnterior: totalAnt,
        variacaoPercentual,
        limiteMensal,
        percentualLimite,
        restanteLimite,
      };
    });
  }

  /**
   * Diagnóstico Financeiro: Essencial vs Estilo de Vida (Regra 50/30/20)
   */
  async obterAnaliseEssencialVsEstilo(mesAno: string): Promise<AnaliseEssencialVsEstilo> {
    const { inicio, fimExclusivo } = getIntervaloMes(mesAno);

    const linhas = await this.db.getAllAsync<{ tipo_gasto: string; total: number }>(
      `SELECT 
         COALESCE(c.tipo_gasto, 'essencial') as tipo_gasto,
         SUM(t.valor) as total
       FROM transacoes t
       INNER JOIN categorias c ON t.categoria_id = c.id
       WHERE t.data >= ? AND t.data < ? AND t.tipo = 'despesa' AND COALESCE(t.is_transfer, 0) = 0 AND t.deleted_at IS NULL
       GROUP BY c.tipo_gasto;`,
      inicio,
      fimExclusivo
    );

    let totalEssencial = 0;
    let totalEstiloDeVida = 0;
    let totalPoupanca = 0;

    for (const l of linhas) {
      if (l.tipo_gasto === 'estilo_de_vida') {
        totalEstiloDeVida += l.total;
      } else if (l.tipo_gasto === 'poupanca') {
        totalPoupanca += l.total;
      } else {
        totalEssencial += l.total;
      }
    }

    const totalGeral = totalEssencial + totalEstiloDeVida + totalPoupanca;
    const percentualEssencial = totalGeral > 0 ? (totalEssencial / totalGeral) * 100 : 0;
    const percentualEstiloDeVida = totalGeral > 0 ? (totalEstiloDeVida / totalGeral) * 100 : 0;
    const percentualPoupanca = totalGeral > 0 ? (totalPoupanca / totalGeral) * 100 : 0;

    return {
      totalEssencial: Math.round(totalEssencial * 100) / 100,
      totalEstiloDeVida: Math.round(totalEstiloDeVida * 100) / 100,
      totalPoupanca: Math.round(totalPoupanca * 100) / 100,
      percentualEssencial: Math.round(percentualEssencial * 10) / 10,
      percentualEstiloDeVida: Math.round(percentualEstiloDeVida * 10) / 10,
      percentualPoupanca: Math.round(percentualPoupanca * 10) / 10,
    };
  }

  /**
   * Previsibilidade de Médio Prazo: Comprometimento de Renda Futura (próximos N meses)
   */
  async obterComprometimentoFuturo(mesesAFrente: number = 6): Promise<ComprometimentoFuturo[]> {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1; // 1-12

    const resultado: ComprometimentoFuturo[] = [];

    // Busca o total mensal de despesas fixas recorrentes ativas
    const recorrentesResult = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM lancamentos_recorrentes WHERE ativo = 1 AND tipo = 'despesa' AND COALESCE(is_transfer, 0) = 0;`
    );
    const totalRecorrentesMensal = Math.round((recorrentesResult?.total || 0) * 100) / 100;

    for (let i = 1; i <= mesesAFrente; i++) {
      let m = mesAtual + i;
      let a = anoAtual;
      while (m > 12) {
        m -= 12;
        a += 1;
      }

      const mesAnoIso = `${a}-${String(m).padStart(2, '0')}`;
      const { inicio: inicioMesFuturo, fimExclusivo: fimMesFuturo } = getIntervaloMes(mesAnoIso);

      // Busca parcelas já registradas para aquele mês
      const parcelasResult = await this.db.getFirstAsync<{ total: number | null; qtd: number }>(
        `SELECT SUM(valor) as total, COUNT(*) as qtd 
         FROM transacoes 
         WHERE data >= ? AND data < ? 
           AND tipo = 'despesa' AND COALESCE(is_transfer, 0) = 0 
           AND total_parcelas IS NOT NULL 
           AND total_parcelas > 1
           AND deleted_at IS NULL;`,
        inicioMesFuturo,
        fimMesFuturo
      );

      const totalParcelas = Math.round((parcelasResult?.total || 0) * 100) / 100;
      const qtdParcelas = parcelasResult?.qtd || 0;
      const totalComprometido = Math.round((totalParcelas + totalRecorrentesMensal) * 100) / 100;

      resultado.push({
        mesAno: mesAnoIso,
        nomeMes: getNomeMesAno(mesAnoIso),
        totalParcelas,
        totalRecorrentes: totalRecorrentesMensal,
        totalComprometido,
        qtdParcelas,
      });
    }

    return resultado;
  }

  /**
   * Projeção de Fluxo de Caixa (próximos N meses):
   * Cruza receitas esperadas (recorrentes ativas) com despesas comprometidas (recorrentes + parcelas futuras)
   * e projeta o saldo líquido de cada mês e a evolução patrimonial acumulada a partir do saldo atual.
   */
  async obterProjecaoFluxoCaixa(mesesAFrente: number = 3): Promise<ProjecaoFluxoMes[]> {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1; // 1-12
    const mesAnoAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;

    // Obtém o saldo realizado atual para servir de ponto de partida acumulado
    const resumoAtual = await this.obterResumoMes(mesAnoAtual);
    let saldoAcumulado = resumoAtual.saldoRealizado;

    // Receitas e despesas recorrentes mensais fixas ativas
    const recorrentesReceitas = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM lancamentos_recorrentes WHERE ativo = 1 AND tipo = 'receita';`
    );
    const totalRecorrentesReceitas = Math.round((recorrentesReceitas?.total || 0) * 100) / 100;

    const recorrentesDespesas = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM lancamentos_recorrentes WHERE ativo = 1 AND tipo = 'despesa' AND COALESCE(is_transfer, 0) = 0;`
    );
    const totalRecorrentesDespesas = Math.round((recorrentesDespesas?.total || 0) * 100) / 100;

    const resultado: ProjecaoFluxoMes[] = [];

    for (let i = 1; i <= mesesAFrente; i++) {
      let m = mesAtual + i;
      let a = anoAtual;
      while (m > 12) {
        m -= 12;
        a += 1;
      }

      const mesAnoIso = `${a}-${String(m).padStart(2, '0')}`;
      const { inicio, fimExclusivo } = getIntervaloMes(mesAnoIso);

      // Parcelas de despesas já agendadas para aquele mês
      const parcelasResult = await this.db.getFirstAsync<{ total: number | null }>(
        `SELECT SUM(valor) as total 
         FROM transacoes 
         WHERE data >= ? AND data < ? 
           AND tipo = 'despesa' AND COALESCE(is_transfer, 0) = 0 
           AND total_parcelas IS NOT NULL 
           AND total_parcelas > 1
           AND deleted_at IS NULL;`,
        inicio,
        fimExclusivo
      );
      const totalParcelasMes = Math.round((parcelasResult?.total || 0) * 100) / 100;

      const receitasEsperadas = totalRecorrentesReceitas;
      const despesasComprometidas = somarMoeda(totalRecorrentesDespesas, totalParcelasMes);
      const saldoMesEstimado = subtrairMoeda(receitasEsperadas, despesasComprometidas);
      saldoAcumulado = somarMoeda(saldoAcumulado, saldoMesEstimado);

      resultado.push({
        mesAno: mesAnoIso,
        nomeMes: getNomeMesAno(mesAnoIso),
        receitasEsperadas,
        despesasComprometidas,
        saldoMesEstimado,
        saldoAcumuladoEstimado: saldoAcumulado,
      });
    }

    return resultado;
  }

  /**
   * Detecção Inteligente de Anomalias de Gastos:
   * Compara o gasto da categoria no mês selecionado com a média dos últimos 3 meses anteriores.
   * Se o gasto for > R$ 80 e estiver pelo menos 35% acima da média histórica, gera um alerta atípico.
   */
  async obterAnomaliasGastos(mesAno: string): Promise<AnomaliaGasto[]> {
    const { inicio: inicioMesAtual, fimExclusivo: fimMesAtual } = getIntervaloMes(mesAno);

    const [anoStr, mesStr] = mesAno.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10);

    const mesesAnteriores: string[] = [];
    for (let i = 1; i <= 3; i++) {
      let m = mes - i;
      let a = ano;
      while (m < 1) {
        m += 12;
        a -= 1;
      }
      mesesAnteriores.push(`${a}-${String(m).padStart(2, '0')}`);
    }

    // Calcula gasto do mês atual por categoria
    const gastosAtuais = await this.db.getAllAsync<{
      categoria_id: number;
      nome: string;
      icone: string;
      cor: string;
      total: number;
    }>(
      `SELECT 
         c.id as categoria_id,
         c.nome,
         c.icone,
         c.cor,
         SUM(t.valor) as total
       FROM transacoes t
       INNER JOIN categorias c ON t.categoria_id = c.id
       WHERE t.data >= ? AND t.data < ? AND t.tipo = 'despesa' AND COALESCE(t.is_transfer, 0) = 0 AND t.deleted_at IS NULL
       GROUP BY c.id;`,
      inicioMesAtual,
      fimMesAtual
    );

    if (gastosAtuais.length === 0) return [];

    // Calcula total gasto nos 3 meses anteriores agrupado por categoria
    const { inicio: dataInicioHistorico } = getIntervaloMes(mesesAnteriores[2]);
    const { fimExclusivo: dataFimHistorico } = getIntervaloMes(mesesAnteriores[0]);

    const historicoGastos = await this.db.getAllAsync<{
      categoria_id: number;
      totalHistorico: number;
      mesesDistintos: number;
    }>(
      `SELECT 
         categoria_id,
         SUM(valor) as totalHistorico,
         COUNT(DISTINCT substr(data, 1, 7)) as mesesDistintos
       FROM transacoes
       WHERE data >= ? AND data < ? AND tipo = 'despesa' AND COALESCE(is_transfer, 0) = 0 AND deleted_at IS NULL
       GROUP BY categoria_id;`,
      dataInicioHistorico,
      dataFimHistorico
    );

    const mapaHistorico = new Map<number, { total: number; meses: number }>();
    for (const h of historicoGastos) {
      mapaHistorico.set(h.categoria_id, {
        total: h.totalHistorico,
        meses: Math.max(1, h.mesesDistintos),
      });
    }

    const anomalias: AnomaliaGasto[] = [];

    for (const atual of gastosAtuais) {
      const hist = mapaHistorico.get(atual.categoria_id);
      if (!hist || hist.total <= 0) continue;

      const mediaHistorica = Math.round((hist.total / hist.meses) * 100) / 100;
      const diferenca = subtrairMoeda(atual.total, mediaHistorica);

      // Regra de anomalia: gasto >= R$ 80, média histórica >= R$ 40, aumento >= 35%, e diferença >= R$ 50
      if (atual.total >= 80 && mediaHistorica >= 40 && diferenca >= 50) {
        const percentualAcima = Math.round(((atual.total - mediaHistorica) / mediaHistorica) * 100);
        if (percentualAcima >= 35) {
          anomalias.push({
            categoriaId: atual.categoria_id,
            categoriaNome: atual.nome,
            categoriaIcone: atual.icone,
            categoriaCor: atual.cor,
            valorAtual: atual.total,
            mediaHistorica,
            percentualAcima,
            diferenca,
          });
        }
      }
    }

    return anomalias.sort((a, b) => b.percentualAcima - a.percentualAcima);
  }

  /**
   * Cálculo de Teto Diário Seguro (Burn Rate) até o fim do mês
   */
  async obterTetoDiario(mesAno: string): Promise<TetoDiarioInfo> {
    const hoje = new Date();
    const [ano, mes] = mesAno.split('-').map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();

    let diaAtual = hoje.getDate();
    const anoHoje = hoje.getFullYear();
    const mesHoje = hoje.getMonth() + 1;

    // Se o mês selecionado for passado ou futuro
    if (ano < anoHoje || (ano === anoHoje && mes < mesHoje)) {
      // Mês já passou
      return { diasRestantes: 0, disponivelDiario: 0, diasNoMes, diaAtual: diasNoMes };
    } else if (ano > anoHoje || (ano === anoHoje && mes > mesHoje)) {
      // Mês futuro completo
      diaAtual = 1;
    }

    const diasRestantes = Math.max(1, diasNoMes - diaAtual + 1);

    // Saldo previsto restante (saldo previsto positivo do mês dividido pelos dias restantes)
    const resumo = await this.obterResumoMes(mesAno);
    const disponivelDiario = resumo.saldo > 0 ? Math.round((resumo.saldo / diasRestantes) * 100) / 100 : 0;

    return {
      diasRestantes,
      disponivelDiario,
      diasNoMes,
      diaAtual,
    };
  }

  async buscarCorrespondenteConciliacao(
    dataIso: string,
    valor: number,
    tipo: TipoTransacao,
    diasTolerancia: number = 3
  ): Promise<Transacao | null> {
    const sql = `
      SELECT 
        t.id,
        t.valor,
        t.tipo,
        t.categoria_id,
        t.data,
        t.descricao,
        t.conciliado,
        t.origem,
        t.pago,
        c.nome as categoria_nome
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.tipo = ?
        AND t.deleted_at IS NULL
        AND ABS(t.valor - ?) < 0.05
        AND ABS(julianday(t.data) - julianday(?)) <= ?
      ORDER BY ABS(julianday(t.data) - julianday(?)) ASC
      LIMIT 1;
    `;

    const row = await this.db.getFirstAsync<Transacao>(
      sql,
      tipo,
      valor,
      dataIso,
      diasTolerancia,
      dataIso
    );
    return row || null;
  }

  /**
   * Busca todas as transações em um intervalo de datas para conciliação otimizada em lote na memória
   */
  async listarPorIntervaloDatas(dataInicio: string, dataFim: string): Promise<Transacao[]> {
    const sql = `
      SELECT 
        t.id,
        t.valor,
        t.tipo,
        t.categoria_id,
        t.data,
        t.descricao,
        t.conciliado,
        t.origem,
        t.pago,
        c.nome as categoria_nome
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.data >= ? AND t.data <= ? AND t.deleted_at IS NULL
      ORDER BY t.data ASC;
    `;
    return await this.db.getAllAsync<Transacao>(sql, dataInicio, dataFim);
  }

  /**
   * Limpa o histórico de transações mantendo categorias e configurações intactas
   */
  async limparHistorico(): Promise<void> {
    await this.db.runAsync('DELETE FROM transacoes;');
  }
}
