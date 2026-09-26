import { SQLiteDatabase } from 'expo-sqlite';
import { TipoTransacao } from '../types';
import { NotificationService } from '../services/notificationService';
import { getDataHojeIso } from '../utils/formatters';

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
  categoria_icone?: string;
  categoria_cor?: string;
}

export class RecurringRepository {
  constructor(private db: SQLiteDatabase) {}

  async listar(): Promise<LancamentoRecorrente[]> {
    const rows = await this.db.getAllAsync<LancamentoRecorrente>(`
      SELECT 
        r.id,
        r.valor,
        r.tipo,
        r.categoria_id,
        r.descricao,
        r.dia_vencimento,
        r.ativo,
        r.ultimo_mes_gerado,
        c.nome as categoria_nome,
        c.icone as categoria_icone,
        c.cor as categoria_cor
      FROM lancamentos_recorrentes r
      INNER JOIN categorias c ON r.categoria_id = c.id
      ORDER BY r.dia_vencimento ASC;
    `);
    return rows;
  }

  async criar(recorrente: Omit<LancamentoRecorrente, 'id'>): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT INTO lancamentos_recorrentes (valor, tipo, categoria_id, descricao, dia_vencimento, ativo, ultimo_mes_gerado)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      recorrente.valor,
      recorrente.tipo,
      recorrente.categoria_id,
      recorrente.descricao || '',
      recorrente.dia_vencimento,
      recorrente.ativo ?? 1,
      recorrente.ultimo_mes_gerado ?? null
    );
    return Number(result.lastInsertRowId);
  }

  async excluir(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM lancamentos_recorrentes WHERE id = ?;', id);
  }

  async alternarStatus(id: number, ativo: boolean): Promise<void> {
    await this.db.runAsync('UPDATE lancamentos_recorrentes SET ativo = ? WHERE id = ?;', ativo ? 1 : 0, id);
  }

  /**
   * Processa os lançamentos fixos para o mês especificado (ex: '2026-09').
   * Se ainda não foram gerados neste mês, insere automaticamente na tabela de transações!
   */
  async processarRecorrentesDoMes(mesAnoIso: string): Promise<number> {
    const recorrentes = await this.listar();
    let gerados = 0;

    const [anoStr, mesStr] = mesAnoIso.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10);
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();

    await this.db.withTransactionAsync(async () => {
      for (const rec of recorrentes) {
        if (rec.ativo !== 1) continue;

        // Se já foi gerado para este mês, ignora
        if (rec.ultimo_mes_gerado === mesAnoIso) continue;

        const dia = Math.min(rec.dia_vencimento, ultimoDiaDoMes);
        const dataIso = `${mesAnoIso}-${String(dia).padStart(2, '0')}`;

        // Verifica se por acaso já existe transação idêntica neste dia para não duplicar
        const existente = await this.db.getFirstAsync<{ id: number }>(
          `SELECT id FROM transacoes 
           WHERE strftime('%Y-%m-%d', data) = ? 
             AND categoria_id = ? 
             AND ABS(valor - ?) < 0.01 
             AND descricao = ?;`,
          dataIso,
          rec.categoria_id,
          rec.valor,
          rec.descricao
        );

        if (!existente) {
          const hojeIso = getDataHojeIso();
          // Se a data do lançamento for hoje ou futura, nasce pendente (0) para controle de pagamento
          const statusPago = dataIso < hojeIso ? 1 : 0;

          await this.db.runAsync(
            `INSERT INTO transacoes (valor, tipo, categoria_id, data, descricao, conciliado, origem, pago)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            rec.valor,
            rec.tipo,
            rec.categoria_id,
            dataIso,
            rec.descricao || (rec.tipo === 'receita' ? 'Renda Fixa' : 'Conta Fixa'),
            0,
            'manual',
            statusPago
          );

          // Agenda notificação de lembrete se for para hoje ou futuro
          NotificationService.agendarLembreteVencimento(rec.descricao, rec.valor, dataIso);
        }

        // Atualiza o último mês gerado
        await this.db.runAsync(
          'UPDATE lancamentos_recorrentes SET ultimo_mes_gerado = ? WHERE id = ?;',
          mesAnoIso,
          rec.id
        );

        gerados++;
      }
    });

    return gerados;
  }
}
