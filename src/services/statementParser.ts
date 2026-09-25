import { TipoTransacao } from '../types';

export interface ItemExtratoBruto {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number; // Sempre positivo
  tipo: TipoTransacao; // 'receita' ou 'despesa'
  fitId?: string;
}

export class StatementParser {
  /**
   * Identifica o formato (OFX ou CSV) e realiza a extração dos itens
   */
  static parse(conteudoTexto: string, nomeArquivo: string): ItemExtratoBruto[] {
    const nomeMinusculo = nomeArquivo.toLowerCase();
    if (nomeMinusculo.endsWith('.ofx') || conteudoTexto.includes('<OFX>') || conteudoTexto.includes('<STMTTRN>')) {
      return this.parseOfx(conteudoTexto);
    }
    return this.parseCsv(conteudoTexto);
  }

  /**
   * Parser robusto para arquivos bancários OFX
   */
  static parseOfx(conteudo: string): ItemExtratoBruto[] {
    const itens: ItemExtratoBruto[] = [];

    // Localiza blocos <STMTTRN>...</STMTTRN> ou apenas <STMTTRN> até o próximo <STMTTRN>
    // Muitos arquivos OFX 1.02 são SGML sem tags de fechamento
    const regexBlocos = /<STMTTRN>([\s\S]*?)(?=(?:<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRN>|$))/gi;

    let match: RegExpExecArray | null;
    while ((match = regexBlocos.exec(conteudo)) !== null) {
      const bloco = match[1];

      // Extrai valor (<TRNAMT>)
      const amtMatch = /<TRNAMT>\s*([+-]?\d+(?:[.,]\d+)?)/i.exec(bloco);
      if (!amtMatch) continue;
      const valorRaw = parseFloat(amtMatch[1].replace(',', '.'));
      if (isNaN(valorRaw) || valorRaw === 0) continue;

      const tipo: TipoTransacao = valorRaw < 0 ? 'despesa' : 'receita';
      const valor = Math.abs(valorRaw);

      // Extrai data (<DTPOSTED>) Ex: 20260925120000 ou 20260925
      const dateMatch = /<DTPOSTED>\s*(\d{4})(\d{2})(\d{2})/i.exec(bloco);
      let dataFormatada = new Date().toISOString().split('T')[0];
      if (dateMatch) {
        dataFormatada = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }

      // Extrai descrição (<MEMO> ou <NAME>)
      let descricao = '';
      const memoMatch = /<MEMO>\s*([^<\r\n]+)/i.exec(bloco);
      const nameMatch = /<NAME>\s*([^<\r\n]+)/i.exec(bloco);

      if (memoMatch && memoMatch[1].trim()) {
        descricao = memoMatch[1].trim();
      } else if (nameMatch && nameMatch[1].trim()) {
        descricao = nameMatch[1].trim();
      } else {
        descricao = tipo === 'receita' ? 'Receita bancária' : 'Despesa bancária';
      }

      // Limpa caracteres especiais HTML/SGML
      descricao = descricao
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');

      // Extrai FITID se existir
      const fitIdMatch = /<FITID>\s*([^<\r\n]+)/i.exec(bloco);
      const fitId = fitIdMatch ? fitIdMatch[1].trim() : undefined;

      itens.push({
        data: dataFormatada,
        descricao,
        valor,
        tipo,
        fitId,
      });
    }

    return itens;
  }

  /**
   * Parser robusto para arquivos bancários CSV (vírgula, ponto-e-vírgula ou tab)
   */
  static parseCsv(conteudo: string): ItemExtratoBruto[] {
    const linhas = conteudo
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (linhas.length < 2) return [];

    // Descobre delimitador analisando a primeira linha
    const cabecalho = linhas[0];
    let delimitador = ',';
    const contagemPontoVirgula = (cabecalho.match(/;/g) || []).length;
    const contagemVirgula = (cabecalho.match(/,/g) || []).length;
    const contagemTab = (cabecalho.match(/\t/g) || []).length;

    if (contagemPontoVirgula > contagemVirgula && contagemPontoVirgula > contagemTab) {
      delimitador = ';';
    } else if (contagemTab > contagemVirgula && contagemTab > contagemPontoVirgula) {
      delimitador = '\t';
    }

    const colunas = this.quebrarLinhaCsv(cabecalho, delimitador).map((c) =>
      c.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );

    // Identifica índices das colunas
    let idxData = colunas.findIndex((c) => c.includes('data') || c.includes('date') || c === 'dt');
    let idxDescricao = colunas.findIndex(
      (c) =>
        c.includes('descricao') ||
        c.includes('title') ||
        c.includes('memo') ||
        c.includes('historico') ||
        c.includes('estabelecimento') ||
        c.includes('detalhes') ||
        c.includes('nome')
    );
    let idxValor = colunas.findIndex(
      (c) => c.includes('valor') || c.includes('amount') || c.includes('value') || c.includes('quantia')
    );

    // Fallbacks padrão caso não encontre cabeçalhos claros
    if (idxData === -1) idxData = 0;
    if (idxDescricao === -1) idxDescricao = 1;
    if (idxValor === -1) idxValor = 2;

    const itens: ItemExtratoBruto[] = [];

    for (let i = 1; i < linhas.length; i++) {
      const colunasLinha = this.quebrarLinhaCsv(linhas[i], delimitador);
      if (colunasLinha.length <= Math.max(idxData, idxDescricao, idxValor)) continue;

      const dataRaw = colunasLinha[idxData];
      const descRaw = colunasLinha[idxDescricao];
      const valorRaw = colunasLinha[idxValor];

      const dataFormatada = this.normalizarData(dataRaw);
      const valorObj = this.normalizarValor(valorRaw);

      if (!dataFormatada || valorObj.valor === 0) continue;

      itens.push({
        data: dataFormatada,
        descricao: descRaw || (valorObj.tipo === 'receita' ? 'Receita extrato' : 'Despesa extrato'),
        valor: valorObj.valor,
        tipo: valorObj.tipo,
      });
    }

    return itens;
  }

  /**
   * Converte strings de data diversas (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY) para YYYY-MM-DD
   */
  private static normalizarData(textoData: string): string {
    if (!textoData) return '';
    const limpo = textoData.replace(/["']/g, '').trim();

    // Formato DD/MM/YYYY ou DD-MM-YYYY
    const ddmmyyyy = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/.exec(limpo);
    if (ddmmyyyy) {
      const dia = ddmmyyyy[1].padStart(2, '0');
      const mes = ddmmyyyy[2].padStart(2, '0');
      const ano = ddmmyyyy[3];
      return `${ano}-${mes}-${dia}`;
    }

    // Formato YYYY-MM-DD
    const yyyymmdd = /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/.exec(limpo);
    if (yyyymmdd) {
      const ano = yyyymmdd[1];
      const mes = yyyymmdd[2].padStart(2, '0');
      const dia = yyyymmdd[3].padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }

    return '';
  }

  /**
   * Converte formatos como "R$ -45,90", "-45.90", "1.250,00" para número e tipo
   */
  private static normalizarValor(textoValor: string): { valor: number; tipo: TipoTransacao } {
    if (!textoValor) return { valor: 0, tipo: 'despesa' };

    let limpo = textoValor.replace(/["'R$\s]/g, '').trim();
    const isNegativo = limpo.includes('-') || (limpo.startsWith('(') && limpo.endsWith(')'));

    // Remove sinais e parênteses
    limpo = limpo.replace(/[-+()]/g, '').trim();

    // Trata formatação brasileira (1.234,56 -> 1234.56)
    if (limpo.includes(',') && limpo.includes('.')) {
      if (limpo.lastIndexOf(',') > limpo.lastIndexOf('.')) {
        limpo = limpo.replace(/\./g, '').replace(',', '.');
      } else {
        limpo = limpo.replace(/,/g, '');
      }
    } else if (limpo.includes(',')) {
      limpo = limpo.replace(',', '.');
    }

    const valorNumerico = parseFloat(limpo);
    if (isNaN(valorNumerico)) return { valor: 0, tipo: 'despesa' };

    return {
      valor: valorNumerico,
      tipo: isNegativo ? 'despesa' : 'receita',
    };
  }

  /**
   * Trata quebra de campos CSV respeitando aspas duplas
   */
  private static quebrarLinhaCsv(linha: string, delimitador: string): string[] {
    const resultado: string[] = [];
    let atual = '';
    let dentroAspas = false;

    for (let i = 0; i < linha.length; i++) {
      const char = linha[i];
      if (char === '"') {
        dentroAspas = !dentroAspas;
      } else if (char === delimitador && !dentroAspas) {
        resultado.push(atual.trim().replace(/^["']|["']$/g, ''));
        atual = '';
      } else {
        atual += char;
      }
    }
    resultado.push(atual.trim().replace(/^["']|["']$/g, ''));
    return resultado;
  }
}
