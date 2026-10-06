import { CartoesRepository } from '../database/cartoesRepo';
import { FaturasRepository } from '../database/faturasRepo';
import { TransactionsRepository } from '../database/transactionsRepo';
import { SQLiteDatabase } from 'expo-sqlite';
import { Transacao } from '../types';

export class CreditCardEngine {
  constructor(
    private db: SQLiteDatabase,
    private cartoesRepo: CartoesRepository,
    private faturasRepo: FaturasRepository,
    private transactionsRepo: TransactionsRepository
  ) {}

  /**
   * Varre todas as transações de cartão de crédito sem fatura e as agrupa em faturas fechadas.
   * Deve ser executado em segundo plano ao abrir o app.
   */
  async processarFechamentos(): Promise<void> {
    try {
      const cartoes = await this.cartoesRepo.buscarTodos();
      if (cartoes.length === 0) return;

      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth() + 1; // 1 a 12
      const diaAtual = hoje.getDate();

      // Busca todas as transações de cartão que ainda não estão presas em uma fatura
      const transacoesSoltas = await this.db.getAllAsync<Transacao>(
        `SELECT * FROM transacoes 
         WHERE cartao_id IS NOT NULL 
           AND fatura_id IS NULL 
           AND deleted_at IS NULL 
           AND tipo = 'despesa'
         ORDER BY data ASC;`
      );

      if (transacoesSoltas.length === 0) return;

      for (const cartao of cartoes) {
        const transacoesCartao = transacoesSoltas.filter((t) => t.cartao_id === cartao.id);
        if (transacoesCartao.length === 0) continue;

        // Agrupar transações por Ciclo de Fatura
        const transacoesPorCiclo = new Map<string, number[]>();
        const totaisPorCiclo = new Map<string, number>();

        for (const t of transacoesCartao) {
          const ciclo = this.determinarCicloDaFatura(t.data, cartao.dia_fechamento);
          
          if (!transacoesPorCiclo.has(ciclo.mesAno)) {
            transacoesPorCiclo.set(ciclo.mesAno, []);
            totaisPorCiclo.set(ciclo.mesAno, 0);
          }
          transacoesPorCiclo.get(ciclo.mesAno)!.push(t.id);
          const totalAtual = totaisPorCiclo.get(ciclo.mesAno)!;
          totaisPorCiclo.set(ciclo.mesAno, totalAtual + t.valor);
        }

        // Verifica quais ciclos já podem ser fechados hoje
        for (const [mesAnoStr, ids] of transacoesPorCiclo.entries()) {
          const dataFechamentoCiclo = this.calcularDataRealFechamento(mesAnoStr, cartao.dia_fechamento);
          const fechamentoObj = new Date(dataFechamentoCiclo + 'T00:00:00');

          // Se a data de fechamento desse ciclo já chegou ou passou, criamos a fatura!
          if (hoje.getTime() >= fechamentoObj.getTime()) {
            const dataVencimentoCiclo = this.calcularDataRealVencimento(mesAnoStr, cartao.dia_vencimento);
            
            const total = totaisPorCiclo.get(mesAnoStr)!;
            
            // Criar Fatura
            const faturaId = await this.faturasRepo.criar({
              cartao_id: cartao.id,
              mes_ano: mesAnoStr,
              data_fechamento: dataFechamentoCiclo,
              data_vencimento: dataVencimentoCiclo,
              valor_total: Math.round(total * 100) / 100,
              status: 'fechada'
            });

            // Vincular
            await this.faturasRepo.vincularTransacoes(faturaId, ids);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao processar fechamentos de cartão:', e);
    }
  }

  /**
   * Dada a data de uma compra e o dia de fechamento do cartão, descobre a qual fatura (AAAA-MM) ela pertence.
   * Regra: Se a compra foi feita no dia de fechamento ou depois, ela cai no ciclo do próximo mês.
   */
  private determinarCicloDaFatura(dataCompraIso: string, diaFechamento: number): { mesAno: string } {
    const [a, m, d] = dataCompraIso.split('-').map(Number);
    let mesDaFatura = m;
    let anoDaFatura = a;

    // Se comprou no dia do fechamento ou depois, entra na fatura do MÊS SEGUINTE
    if (d >= diaFechamento) {
      mesDaFatura += 1;
      if (mesDaFatura > 12) {
        mesDaFatura = 1;
        anoDaFatura += 1;
      }
    }

    return { mesAno: `${anoDaFatura}-${String(mesDaFatura).padStart(2, '0')}` };
  }

  private calcularDataRealFechamento(mesAno: string, diaFechamento: number): string {
    // A data de fechamento real do ciclo "AAAA-MM" ocorre no mês anterior ao mês do nome da fatura?
    // Não. O ciclo "Fevereiro" (02) vence em Fev, e fecha em Fev (ex: fecha dia 05/02, vence 15/02).
    const [a, m] = mesAno.split('-');
    return `${a}-${m}-${String(diaFechamento).padStart(2, '0')}`;
  }

  private calcularDataRealVencimento(mesAno: string, diaVencimento: number): string {
    const [a, m] = mesAno.split('-');
    return `${a}-${m}-${String(diaVencimento).padStart(2, '0')}`;
  }

  async pagarFatura(faturaId: number, contaPagadoraId: number): Promise<void> {
    const fatura = await this.faturasRepo.obterPorId(faturaId);
    if (!fatura) throw new Error('Fatura não encontrada');

    await this.faturasRepo.atualizarStatus(faturaId, 'paga');
    await this.db.runAsync('UPDATE transacoes SET pago = 1 WHERE fatura_id = ?', faturaId);
    
    await this.transactionsRepo.criar({
      tipo: 'despesa',
      valor: fatura.valor_total,
      conta_id: contaPagadoraId,
      forma_pagamento: 'pagamento_fatura',
      descricao: 'Pagamento de Fatura',
      pago: 1,
      conciliado: 1,
      categoria_id: 1, // Default ID
      data: new Date().toISOString().split('T')[0],
      origem: 'manual'
    });
  }
}
