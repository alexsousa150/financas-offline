import { SQLiteDatabase } from 'expo-sqlite';
import {
  Transacao,
  TipoTransacao,
  ResumoFinanceiro,
  RankingCategoria,
  ComprometimentoFuturo,
  TetoDiarioInfo,
  AnaliseEssencialVsEstilo,
} from '../types';
import { getMesAnterior, getNomeMesAno, getMesPosterior } from '../utils/formatters';

export interface FiltrosTransacao {
  mesAno?: string; // Formato YYYY-MM
  tipo?: TipoTransacao;
  categoriaId?: number;
  pago?: number; // 0 = pendente, 1 = pago
  busca?: string;
  limite?: number;
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
        t.created_at,
        c.nome as categoria_nome,
        c.icone as categoria_icone,
        c.cor as categoria_cor,
        c.tipo_gasto as categoria_tipo_gasto
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filtros.mesAno) {
      sql += ` AND strftime('%Y-%m', t.data) = ?`;
      params.push(filtros.mesAno);
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

    sql += ` ORDER BY t.data DESC, t.id DESC`;

    if (filtros.limite && filtros.limite > 0) {
      sql += ` LIMIT ?`;
      params.push(filtros.limite);
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
        t.created_at,
        c.nome as categoria_nome,
        c.icone as categoria_icone,
        c.cor as categoria_cor,
        c.tipo_gasto as categoria_tipo_gasto
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.id = ?;
    `;
    const row = await this.db.getFirstAsync<Transacao>(sql, id);
    return row || null;
  }

  async criar(transacao: Omit<Transacao, 'id'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO transacoes (valor, tipo, categoria_id, data, descricao, conciliado, origem, pago, parcela_atual, total_parcelas, grupo_parcelamento_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      transacao.valor,
      transacao.tipo,
      transacao.categoria_id,
      transacao.data,
      transacao.descricao || '',
      transacao.conciliado ? 1 : 0,
      transacao.origem || 'manual',
      transacao.pago !== undefined ? (transacao.pago ? 1 : 0) : 1,
      transacao.parcela_atual ?? null,
      transacao.total_parcelas ?? null,
      transacao.grupo_parcelamento_id ?? null
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

    const valorParcelaBase = Math.floor((valorTotal / numeroParcelas) * 100) / 100;
    const diferencaCentavos = Math.round((valorTotal - valorParcelaBase * numeroParcelas) * 100) / 100;
    const primeiraParcelaValor = Math.round((valorParcelaBase + diferencaCentavos) * 100) / 100;

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
          `INSERT INTO transacoes (valor, tipo, categoria_id, data, descricao, conciliado, origem, pago, parcela_atual, total_parcelas, grupo_parcelamento_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          valorDestaParcela,
          transacaoBase.tipo,
          transacaoBase.categoria_id,
          dataParcelaIso,
          descricaoComParcela,
          0,
          transacaoBase.origem || 'manual',
          statusPago,
          p,
          numeroParcelas,
          grupoId
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
          'DELETE FROM transacoes WHERE grupo_parcelamento_id = ?;',
          transacao.grupo_parcelamento_id
        );
        return;
      }
    }

    await this.db.runAsync('DELETE FROM transacoes WHERE id = ?;', id);
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
          `INSERT INTO transacoes (valor, tipo, categoria_id, data, descricao, conciliado, origem, pago, parcela_atual, total_parcelas, grupo_parcelamento_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          t.valor,
          t.tipo,
          t.categoria_id,
          t.data,
          t.descricao || '',
          t.conciliado ? 1 : 0,
          t.origem || 'importado',
          t.pago !== undefined ? (t.pago ? 1 : 0) : 1,
          t.parcela_atual ?? null,
          t.total_parcelas ?? null,
          t.grupo_parcelamento_id ?? null
        );
        totalInseridos++;
      }
    });

    return totalInseridos;
  }

  /**
   * Resumo Financeiro Completo com visão dupla: Saldo Realizado (em conta hoje) vs Saldo Previsto (fim do mês)
   */
  async obterResumoMes(mesAno: string): Promise<ResumoFinanceiro> {
    // 1. Totais Gerais do Mês (Previsto total)
    const recPrev = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = 'receita';`,
      mesAno
    );
    const despPrev = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = 'despesa';`,
      mesAno
    );

    // 2. Totais Realizados (apenas pago = 1)
    const recReal = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = 'receita' AND pago = 1;`,
      mesAno
    );
    const despReal = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = 'despesa' AND pago = 1;`,
      mesAno
    );

    // 3. Pendências do Mês (pago = 0)
    const despPend = await this.db.getFirstAsync<{ total: number | null; qtd: number }>(
      `SELECT SUM(valor) as total, COUNT(*) as qtd FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = 'despesa' AND pago = 0;`,
      mesAno
    );
    const recPend = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = 'receita' AND pago = 0;`,
      mesAno
    );

    const receitas = Math.round((recPrev?.total || 0) * 100) / 100;
    const despesas = Math.round((despPrev?.total || 0) * 100) / 100;
    const saldo = Math.round((receitas - despesas) * 100) / 100;

    const receitasRealizadas = Math.round((recReal?.total || 0) * 100) / 100;
    const despesasRealizadas = Math.round((despReal?.total || 0) * 100) / 100;
    const saldoRealizado = Math.round((receitasRealizadas - despesasRealizadas) * 100) / 100;

    const despesasPendentes = Math.round((despPend?.total || 0) * 100) / 100;
    const contasPendentesQtd = despPend?.qtd || 0;
    const receitasPendentes = Math.round((recPend?.total || 0) * 100) / 100;

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
   * Resumo Anual consolidado para visão macro e evolução patrimonial
   */
  async obterResumoAno(ano: number): Promise<{
    receitas: number;
    despesas: number;
    saldo: number;
    taxaEconomia: number;
    mesesComDados: number;
  }> {
    const anoStr = String(ano);
    const rec = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y', data) = ? AND tipo = 'receita' AND pago = 1;`,
      anoStr
    );
    const desp = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y', data) = ? AND tipo = 'despesa' AND pago = 1;`,
      anoStr
    );
    const meses = await this.db.getFirstAsync<{ qtd: number }>(
      `SELECT COUNT(DISTINCT strftime('%Y-%m', data)) as qtd FROM transacoes WHERE strftime('%Y', data) = ?;`,
      anoStr
    );

    const receitas = Math.round((rec?.total || 0) * 100) / 100;
    const despesas = Math.round((desp?.total || 0) * 100) / 100;
    const saldo = Math.round((receitas - despesas) * 100) / 100;
    const taxaEconomia = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0;

    return {
      receitas,
      despesas,
      saldo,
      taxaEconomia: Math.round(taxaEconomia * 10) / 10,
      mesesComDados: meses?.qtd || 0,
    };
  }

  /**
   * Ranking detalhado das categorias incluindo limites de gastos mensais e tipo de gasto
   */
  async obterRankingCategorias(mesAno: string, tipo: TipoTransacao = 'despesa'): Promise<RankingCategoria[]> {
    const mesAnterior = getMesAnterior(mesAno);

    const totalPeriodoResult = await this.db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(valor) as total FROM transacoes WHERE strftime('%Y-%m', data) = ? AND tipo = ?;`,
      mesAno,
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
       WHERE strftime('%Y-%m', t.data) = ? AND t.tipo = ?
       GROUP BY c.id
       ORDER BY total DESC;`,
      mesAno,
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
       WHERE strftime('%Y-%m', data) = ? AND tipo = ?
       GROUP BY categoria_id;`,
      mesAnterior,
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
    const linhas = await this.db.getAllAsync<{ tipo_gasto: string; total: number }>(
      `SELECT 
         COALESCE(c.tipo_gasto, 'essencial') as tipo_gasto,
         SUM(t.valor) as total
       FROM transacoes t
       INNER JOIN categorias c ON t.categoria_id = c.id
       WHERE strftime('%Y-%m', t.data) = ? AND t.tipo = 'despesa'
       GROUP BY c.tipo_gasto;`,
      mesAno
    );

    let totalEssencial = 0;
    let totalEstiloDeVida = 0;

    for (const l of linhas) {
      if (l.tipo_gasto === 'estilo_de_vida') {
        totalEstiloDeVida += l.total;
      } else {
        totalEssencial += l.total;
      }
    }

    const totalGeral = totalEssencial + totalEstiloDeVida;
    const percentualEssencial = totalGeral > 0 ? (totalEssencial / totalGeral) * 100 : 0;
    const percentualEstiloDeVida = totalGeral > 0 ? (totalEstiloDeVida / totalGeral) * 100 : 0;

    return {
      totalEssencial: Math.round(totalEssencial * 100) / 100,
      totalEstiloDeVida: Math.round(totalEstiloDeVida * 100) / 100,
      percentualEssencial: Math.round(percentualEssencial * 10) / 10,
      percentualEstiloDeVida: Math.round(percentualEstiloDeVida * 10) / 10,
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
      `SELECT SUM(valor) as total FROM lancamentos_recorrentes WHERE ativo = 1 AND tipo = 'despesa';`
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

      // Busca parcelas já registradas para aquele mês
      const parcelasResult = await this.db.getFirstAsync<{ total: number | null; qtd: number }>(
        `SELECT SUM(valor) as total, COUNT(*) as qtd 
         FROM transacoes 
         WHERE strftime('%Y-%m', data) = ? 
           AND tipo = 'despesa' 
           AND total_parcelas IS NOT NULL 
           AND total_parcelas > 1;`,
        mesAnoIso
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
      WHERE t.data >= ? AND t.data <= ?
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
