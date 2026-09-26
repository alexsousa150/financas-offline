import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { BackupData, Categoria, Transacao, LancamentoRecorrente } from '../types';
import { formatarDataBr } from '../utils/formatters';

export class BackupRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Exporta todo o banco de dados em um arquivo JSON completo e permite salvar/compartilhar
   */
  async exportarBackup(): Promise<string> {
    const categorias = await this.db.getAllAsync<Categoria>(
      'SELECT id, nome, icone, cor, ordem, limite_mensal, tipo_gasto FROM categorias ORDER BY id ASC;'
    );
    const transacoes = await this.db.getAllAsync<Transacao>(
      `SELECT id, valor, tipo, categoria_id, data, descricao, conciliado, origem, pago, 
              parcela_atual, total_parcelas, grupo_parcelamento_id, created_at 
       FROM transacoes ORDER BY data ASC, id ASC;`
    );
    const recorrentes = await this.db.getAllAsync<LancamentoRecorrente>(
      `SELECT id, valor, tipo, categoria_id, descricao, dia_vencimento, ativo, ultimo_mes_gerado 
       FROM lancamentos_recorrentes ORDER BY id ASC;`
    );
    const configsRows = await this.db.getAllAsync<{ chave: string; valor: string }>(
      'SELECT chave, valor FROM configuracoes;'
    );

    const configuracoes: Record<string, string> = {};
    for (const r of configsRows) {
      configuracoes[r.chave] = r.valor;
    }

    const dadosBackup: BackupData = {
      versao: 2,
      exportadoEm: new Date().toISOString(),
      categorias,
      transacoes,
      recorrentes,
      configuracoes,
    };

    const jsonString = JSON.stringify(dadosBackup, null, 2);
    const dataHora = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivo = `backup_financas_${dataHora}.json`;
    const caminhoArquivo = `${FileSystem.documentDirectory}${nomeArquivo}`;

    await FileSystem.writeAsStringAsync(caminhoArquivo, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(caminhoArquivo, {
        mimeType: 'application/json',
        dialogTitle: 'Salvar ou Compartilhar Backup das Finanças',
        UTI: 'public.json',
      });
    }

    return caminhoArquivo;
  }

  /**
   * Exporta relatório em planilha Excel / CSV (compatível com Excel, Planilhas Google e Imposto de Renda)
   */
  async exportarPlanilhaCsv(mesAno?: string): Promise<string> {
    let sql = `
      SELECT 
        t.data,
        t.tipo,
        c.nome as categoria_nome,
        t.descricao,
        t.valor,
        t.pago,
        t.parcela_atual,
        t.total_parcelas
      FROM transacoes t
      INNER JOIN categorias c ON t.categoria_id = c.id
    `;
    const params: any[] = [];
    if (mesAno) {
      sql += ` WHERE strftime('%Y-%m', t.data) = ?`;
      params.push(mesAno);
    }
    sql += ` ORDER BY t.data DESC;`;

    const linhas = await this.db.getAllAsync<{
      data: string;
      tipo: string;
      categoria_nome: string;
      descricao: string;
      valor: number;
      pago: number;
      parcela_atual: number | null;
      total_parcelas: number | null;
    }>(sql, ...params);

    const cabecalho = 'Data;Tipo;Categoria;Descrição;Valor (R$);Status;Parcelamento\n';
    const corpo = linhas
      .map((l) => {
        const dataBr = formatarDataBr(l.data);
        const tipoStr = l.tipo === 'receita' ? 'Receita' : 'Despesa';
        const desc = (l.descricao || '').replace(/;/g, ',');
        const valorFormatado = l.valor.toFixed(2).replace('.', ',');
        const status = l.pago === 0 ? 'Pendente' : 'Pago';
        const parcela = l.parcela_atual && l.total_parcelas ? `${l.parcela_atual}/${l.total_parcelas}` : 'À vista';
        return `${dataBr};${tipoStr};${l.categoria_nome};${desc};${valorFormatado};${status};${parcela}`;
      })
      .join('\n');

    // \uFEFF adiciona UTF-8 BOM para garantir acentuação correta no Excel brasileiro
    const csvConteudo = '\uFEFF' + cabecalho + corpo;

    const periodo = mesAno ? `_${mesAno}` : '_completo';
    const nomeArquivo = `relatorio_financeiro${periodo}.csv`;
    const caminhoArquivo = `${FileSystem.documentDirectory}${nomeArquivo}`;

    await FileSystem.writeAsStringAsync(caminhoArquivo, csvConteudo, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(caminhoArquivo, {
        mimeType: 'text/csv',
        dialogTitle: 'Compartilhar Planilha Excel / CSV',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return caminhoArquivo;
  }

  /**
   * Restaura os dados a partir de um JSON de backup de forma atômica
   */
  async restaurarBackup(dadosJson: BackupData): Promise<{
    categoriasRestauradas: number;
    transacoesRestauradas: number;
    recorrentesRestaurados: number;
  }> {
    if (!dadosJson.categorias || !dadosJson.transacoes) {
      throw new Error('Formato de backup inválido.');
    }

    let categoriasCount = 0;
    let transacoesCount = 0;
    let recorrentesCount = 0;

    await this.db.withTransactionAsync(async () => {
      // Limpa dados atuais
      await this.db.runAsync('DELETE FROM transacoes;');
      await this.db.runAsync('DELETE FROM categorias;');
      await this.db.runAsync('DELETE FROM lancamentos_recorrentes;');

      // Restaura categorias
      for (const cat of dadosJson.categorias) {
        await this.db.runAsync(
          `INSERT INTO categorias (id, nome, icone, cor, ordem, limite_mensal, tipo_gasto) 
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          cat.id,
          cat.nome,
          cat.icone,
          cat.cor,
          cat.ordem ?? 0,
          cat.limite_mensal ?? null,
          cat.tipo_gasto || 'essencial'
        );
        categoriasCount++;
      }

      // Restaura transações
      for (const tr of dadosJson.transacoes) {
        await this.db.runAsync(
          `INSERT INTO transacoes (id, valor, tipo, categoria_id, data, descricao, conciliado, origem, pago, parcela_atual, total_parcelas, grupo_parcelamento_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          tr.id,
          tr.valor,
          tr.tipo,
          tr.categoria_id,
          tr.data,
          tr.descricao || '',
          tr.conciliado ? 1 : 0,
          tr.origem || 'manual',
          tr.pago !== undefined ? (tr.pago ? 1 : 0) : 1,
          tr.parcela_atual ?? null,
          tr.total_parcelas ?? null,
          tr.grupo_parcelamento_id ?? null,
          tr.created_at || new Date().toISOString()
        );
        transacoesCount++;
      }

      // Restaura recorrentes se existirem no backup
      if (dadosJson.recorrentes && Array.isArray(dadosJson.recorrentes)) {
        for (const rec of dadosJson.recorrentes) {
          await this.db.runAsync(
            `INSERT INTO lancamentos_recorrentes (id, valor, tipo, categoria_id, descricao, dia_vencimento, ativo, ultimo_mes_gerado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            rec.id,
            rec.valor,
            rec.tipo,
            rec.categoria_id,
            rec.descricao || '',
            rec.dia_vencimento,
            rec.ativo !== undefined ? (rec.ativo ? 1 : 0) : 1,
            rec.ultimo_mes_gerado ?? null
          );
          recorrentesCount++;
        }
      }

      // Restaura configurações se existirem
      if (dadosJson.configuracoes) {
        for (const [chave, valor] of Object.entries(dadosJson.configuracoes)) {
          await this.db.runAsync(
            'INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?);',
            chave,
            valor
          );
        }
      }
    });

    return {
      categoriasRestauradas: categoriasCount,
      transacoesRestauradas: transacoesCount,
      recorrentesRestaurados: recorrentesCount,
    };
  }
}
