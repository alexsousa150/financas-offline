import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { BackupData, Categoria, Transacao } from '../types';

export class BackupRepository {
  constructor(private db: SQLiteDatabase) {}

  /**
   * Exporta todo o banco de dados em um arquivo JSON e permite salvar/compartilhar
   */
  async exportarBackup(): Promise<string> {
    const categorias = await this.db.getAllAsync<Categoria>(
      'SELECT id, nome, icone, cor, ordem FROM categorias ORDER BY id ASC;'
    );
    const transacoes = await this.db.getAllAsync<Transacao>(
      'SELECT id, valor, tipo, categoria_id, data, descricao, conciliado, origem, created_at FROM transacoes ORDER BY data ASC, id ASC;'
    );

    const dadosBackup: BackupData = {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      categorias,
      transacoes,
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
   * Restaura os dados a partir de um JSON de backup de forma atômica
   */
  async restaurarBackup(dadosJson: BackupData): Promise<{ categoriasRestauradas: number; transacoesRestauradas: number }> {
    if (!dadosJson.categorias || !dadosJson.transacoes) {
      throw new Error('Formato de backup inválido.');
    }

    let categoriasCount = 0;
    let transacoesCount = 0;

    await this.db.withTransactionAsync(async () => {
      // Limpa dados atuais
      await this.db.runAsync('DELETE FROM transacoes;');
      await this.db.runAsync('DELETE FROM categorias;');

      // Restaura categorias
      for (const cat of dadosJson.categorias) {
        await this.db.runAsync(
          'INSERT INTO categorias (id, nome, icone, cor, ordem) VALUES (?, ?, ?, ?, ?);',
          cat.id,
          cat.nome,
          cat.icone,
          cat.cor,
          cat.ordem ?? 0
        );
        categoriasCount++;
      }

      // Restaura transações
      for (const tr of dadosJson.transacoes) {
        await this.db.runAsync(
          `INSERT INTO transacoes (id, valor, tipo, categoria_id, data, descricao, conciliado, origem, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          tr.id,
          tr.valor,
          tr.tipo,
          tr.categoria_id,
          tr.data,
          tr.descricao || '',
          tr.conciliado ? 1 : 0,
          tr.origem || 'manual',
          tr.created_at || new Date().toISOString()
        );
        transacoesCount++;
      }
    });

    return { categoriasRestauradas: categoriasCount, transacoesRestauradas: transacoesCount };
  }
}
