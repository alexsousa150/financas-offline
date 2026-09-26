import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { BackupData, Categoria, Transacao, LancamentoRecorrente, Favorito } from '../types';
import { formatarDataBr } from '../utils/formatters';

export interface StatusBackupInfo {
  precisaBackup: boolean;
  diasSemBackup: number | null;
  novosLancamentos: number;
  ultimoBackupEm: string | null;
}

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
    const favoritos = await this.db.getAllAsync<Favorito>(
      `SELECT id, titulo, valor, tipo, categoria_id, icone FROM favoritos ORDER BY id ASC;`
    );
    const configsRows = await this.db.getAllAsync<{ chave: string; valor: string }>(
      'SELECT chave, valor FROM configuracoes;'
    );

    const configuracoes: Record<string, string> = {};
    for (const r of configsRows) {
      configuracoes[r.chave] = r.valor;
    }

    const agoraIso = new Date().toISOString();

    const dadosBackup: BackupData = {
      versao: 3,
      exportadoEm: agoraIso,
      categorias,
      transacoes,
      recorrentes,
      favoritos,
      configuracoes,
    };

    const jsonString = JSON.stringify(dadosBackup, null, 2);
    const dataHora = agoraIso.replace(/[:.]/g, '-');
    const nomeArquivo = `backup_financas_${dataHora}.json`;
    const caminhoArquivo = `${FileSystem.documentDirectory}${nomeArquivo}`;

    await FileSystem.writeAsStringAsync(caminhoArquivo, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Registra último backup realizado
    await this.registrarBackupRealizado(transacoes.length);

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
        const cat = (l.categoria_nome || '').replace(/;/g, ',');
        const desc = (l.descricao || '').replace(/;/g, ',');
        const valorFormatado = l.valor.toFixed(2).replace('.', ',');
        const statusStr = l.pago === 0 ? 'Pendente' : 'Pago';
        const parcelamentoStr = l.parcela_atual && l.total_parcelas ? `${l.parcela_atual}/${l.total_parcelas}` : 'À vista';

        return `${dataBr};${tipoStr};${cat};${desc};${valorFormatado};${statusStr};${parcelamentoStr}`;
      })
      .join('\n');

    const csvCompleto = '\uFEFF' + cabecalho + corpo;
    const sufixo = mesAno ? `_${mesAno}` : '_completo';
    const nomeArquivo = `extrato_financas${sufixo}.csv`;
    const caminhoArquivo = `${FileSystem.documentDirectory}${nomeArquivo}`;

    await FileSystem.writeAsStringAsync(caminhoArquivo, csvCompleto, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(caminhoArquivo, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Planilha de Lançamentos',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return caminhoArquivo;
  }

  /**
   * Atualiza as chaves de último backup realizado
   */
  async registrarBackupRealizado(totalTransacoes?: number): Promise<void> {
    const agora = new Date().toISOString();
    let contagem = totalTransacoes;
    if (contagem === undefined) {
      const res = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM transacoes;');
      contagem = res?.count || 0;
    }

    await this.db.runAsync(
      `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;`,
      'ultimo_backup_em',
      agora
    );

    await this.db.runAsync(
      `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
       ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;`,
      'transacoes_no_ultimo_backup',
      String(contagem)
    );
  }

  /**
   * Verifica se o usuário necessita de um aviso de backup periódico
   */
  async verificarStatusBackup(): Promise<StatusBackupInfo> {
    const rowUltimo = await this.db.getFirstAsync<{ valor: string }>(
      "SELECT valor FROM configuracoes WHERE chave = 'ultimo_backup_em';"
    );
    const rowCountBackup = await this.db.getFirstAsync<{ valor: string }>(
      "SELECT valor FROM configuracoes WHERE chave = 'transacoes_no_ultimo_backup';"
    );
    const rowTotalAtual = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transacoes;'
    );

    const totalAtual = rowTotalAtual?.count || 0;
    const transacoesUltimo = rowCountBackup?.valor ? parseInt(rowCountBackup.valor, 10) : 0;
    const novosLancamentos = Math.max(0, totalAtual - transacoesUltimo);

    if (!rowUltimo?.valor) {
      return {
        precisaBackup: totalAtual >= 15,
        diasSemBackup: null,
        novosLancamentos: totalAtual,
        ultimoBackupEm: null,
      };
    }

    const dataUltimo = new Date(rowUltimo.valor);
    const agora = new Date();
    const diferencaMs = agora.getTime() - dataUltimo.getTime();
    const diasSemBackup = Math.floor(diferencaMs / (1000 * 60 * 60 * 24));

    // Precisa de backup se passaram 30 dias OU se há mais de 30 lançamentos novos
    const precisaBackup = (diasSemBackup >= 30 && novosLancamentos >= 5) || novosLancamentos >= 30;

    return {
      precisaBackup,
      diasSemBackup,
      novosLancamentos,
      ultimoBackupEm: rowUltimo.valor,
    };
  }

  /**
   * Restaura os dados a partir de um JSON de backup de forma atômica
   */
  async restaurarBackup(dadosJson: BackupData): Promise<{
    categoriasRestauradas: number;
    transacoesRestauradas: number;
    recorrentesRestaurados: number;
    favoritosRestaurados: number;
  }> {
    if (!dadosJson.categorias || !dadosJson.transacoes) {
      throw new Error('Formato de backup inválido.');
    }

    let categoriasCount = 0;
    let transacoesCount = 0;
    let recorrentesCount = 0;
    let favoritosCount = 0;

    await this.db.withTransactionAsync(async () => {
      // Limpa dados atuais
      await this.db.runAsync('DELETE FROM transacoes;');
      await this.db.runAsync('DELETE FROM categorias;');
      await this.db.runAsync('DELETE FROM lancamentos_recorrentes;');
      await this.db.runAsync('DELETE FROM favoritos;');

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

      // Restaura favoritos se existirem no backup
      if (dadosJson.favoritos && Array.isArray(dadosJson.favoritos)) {
        for (const fav of dadosJson.favoritos) {
          await this.db.runAsync(
            `INSERT INTO favoritos (id, titulo, valor, tipo, categoria_id, icone)
             VALUES (?, ?, ?, ?, ?, ?);`,
            fav.id,
            fav.titulo,
            fav.valor,
            fav.tipo || 'despesa',
            fav.categoria_id,
            fav.icone ?? null
          );
          favoritosCount++;
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

    // Registra que acabou de restaurar
    await this.registrarBackupRealizado(transacoesCount);

    return {
      categoriasRestauradas: categoriasCount,
      transacoesRestauradas: transacoesCount,
      recorrentesRestaurados: recorrentesCount,
      favoritosRestaurados: favoritosCount,
    };
  }
}
