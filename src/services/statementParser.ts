import type {
  TipoTransacao,
  BancoPresetId,
  BancoPreset,
  ResultadoParseExtrato,
  ItemExtratoBruto,
} from '../types/index.ts';

export type { ItemExtratoBruto };

export const BANCOS_PRESETS: Record<BancoPresetId, BancoPreset> = {
  nubank: {
    id: 'nubank',
    nome: 'Nubank',
    cor: '#820AD1',
    icone: 'card-outline',
    descricao: 'Nu Pagamentos S.A. (Conta e Cartão)',
  },
  inter: {
    id: 'inter',
    nome: 'Banco Inter',
    cor: '#FF7A00',
    icone: 'wallet-outline',
    descricao: 'Banco Inter S.A.',
  },
  itau: {
    id: 'itau',
    nome: 'Itaú Unibanco',
    cor: '#EC7000',
    icone: 'business-outline',
    descricao: 'Itaú Unibanco S.A.',
  },
  bradesco: {
    id: 'bradesco',
    nome: 'Bradesco',
    cor: '#CC092F',
    icone: 'business-outline',
    descricao: 'Banco Bradesco S.A.',
  },
  bb: {
    id: 'bb',
    nome: 'Banco do Brasil',
    cor: '#003882',
    icone: 'cash-outline',
    descricao: 'Banco do Brasil S.A.',
  },
  caixa: {
    id: 'caixa',
    nome: 'Caixa Econômica',
    cor: '#0066B3',
    icone: 'shield-outline',
    descricao: 'Caixa Econômica Federal',
  },
  c6: {
    id: 'c6',
    nome: 'C6 Bank',
    cor: '#242424',
    icone: 'cube-outline',
    descricao: 'Banco C6 S.A.',
  },
  generico: {
    id: 'generico',
    nome: 'Padrão Bancário (FEBRABAN)',
    cor: '#3B82F6',
    icone: 'receipt-outline',
    descricao: 'Formato bancário padrão OFX ou CSV',
  },
};

export class StatementParser {
  /**
   * Identifica o banco emissor do extrato com base no conteúdo e nome do arquivo
   */
  static detectarBanco(conteudoTexto: string, nomeArquivo: string): BancoPreset {
    const textoUpper = conteudoTexto.toUpperCase();
    const nomeMinusculo = nomeArquivo.toLowerCase();

    // 1. Verificação por tags OFX (<ORG>, <FID>, <BANKID>)
    if (textoUpper.includes('<OFX>') || textoUpper.includes('<STMTTRN>')) {
      if (
        textoUpper.includes('NU PAGAMENTOS') ||
        textoUpper.includes('NUBANK') ||
        /<FID>\s*260\b/i.test(conteudoTexto)
      ) {
        return BANCOS_PRESETS.nubank;
      }
      if (
        textoUpper.includes('BANCO INTER') ||
        textoUpper.includes('INTERMEDIUM') ||
        /<FID>\s*0?77\b/i.test(conteudoTexto)
      ) {
        return BANCOS_PRESETS.inter;
      }
      if (
        textoUpper.includes('ITAU') ||
        textoUpper.includes('ITAÚ') ||
        /<FID>\s*341\b/i.test(conteudoTexto)
      ) {
        return BANCOS_PRESETS.itau;
      }
      if (
        textoUpper.includes('BRADESCO') ||
        /<FID>\s*237\b/i.test(conteudoTexto)
      ) {
        return BANCOS_PRESETS.bradesco;
      }
      if (
        textoUpper.includes('BANCO DO BRASIL') ||
        /<FID>\s*0?0?1\b/i.test(conteudoTexto)
      ) {
        return BANCOS_PRESETS.bb;
      }
      if (
        textoUpper.includes('CAIXA ECONOMICA') ||
        textoUpper.includes('CAIXA ECONÔMICA') ||
        /<FID>\s*104\b/i.test(conteudoTexto)
      ) {
        return BANCOS_PRESETS.caixa;
      }
      if (
        textoUpper.includes('BANCO C6') ||
        textoUpper.includes('C6 BANK') ||
        /<FID>\s*336\b/i.test(conteudoTexto)
      ) {
        return BANCOS_PRESETS.c6;
      }
    }

    // 2. Verificação pelo nome do arquivo
    if (nomeMinusculo.includes('nubank') || nomeMinusculo.startsWith('nu_')) {
      return BANCOS_PRESETS.nubank;
    }
    if (nomeMinusculo.includes('inter')) {
      return BANCOS_PRESETS.inter;
    }
    if (nomeMinusculo.includes('itau') || nomeMinusculo.includes('itaú')) {
      return BANCOS_PRESETS.itau;
    }
    if (nomeMinusculo.includes('bradesco')) {
      return BANCOS_PRESETS.bradesco;
    }
    if (
      nomeMinusculo.includes('bancodobrasil') ||
      nomeMinusculo.includes('banco_do_brasil') ||
      nomeMinusculo.startsWith('bb_')
    ) {
      return BANCOS_PRESETS.bb;
    }
    if (nomeMinusculo.includes('caixa') || nomeMinusculo.includes('cef')) {
      return BANCOS_PRESETS.caixa;
    }
    if (nomeMinusculo.includes('c6')) {
      return BANCOS_PRESETS.c6;
    }

    // 3. Verificação por cabeçalhos CSV característicos
    const primeiraLinha = conteudoTexto.split(/\r?\n/)[0]?.toLowerCase() || '';
    if (
      primeiraLinha.includes('identificador') ||
      (primeiraLinha.includes('category') && primeiraLinha.includes('title') && primeiraLinha.includes('amount'))
    ) {
      return BANCOS_PRESETS.nubank;
    }
    if (
      primeiraLinha.includes('saldo') &&
      primeiraLinha.includes('historico') &&
      primeiraLinha.includes('descricao')
    ) {
      return BANCOS_PRESETS.inter;
    }
    if (
      (primeiraLinha.includes('credito') || primeiraLinha.includes('crédito')) &&
      (primeiraLinha.includes('debito') || primeiraLinha.includes('débito'))
    ) {
      return BANCOS_PRESETS.bradesco;
    }
    if (primeiraLinha.includes('balancete') || primeiraLinha.includes('dependencia')) {
      return BANCOS_PRESETS.bb;
    }
    if (primeiraLinha.includes('data mov') || primeiraLinha.includes('nr. doc')) {
      return BANCOS_PRESETS.caixa;
    }

    return BANCOS_PRESETS.generico;
  }

  /**
   * Processa o extrato retornando os itens e o diagnóstico completo com preset do banco
   */
  static parseComDiagnostico(conteudoTexto: string, nomeArquivo: string): ResultadoParseExtrato {
    const nomeMinusculo = nomeArquivo.toLowerCase();
    const ehOfx =
      nomeMinusculo.endsWith('.ofx') ||
      conteudoTexto.includes('<OFX>') ||
      conteudoTexto.includes('<STMTTRN>');

    const banco = this.detectarBanco(conteudoTexto, nomeArquivo);
    const formato = ehOfx ? 'OFX' : 'CSV';
    const itens = ehOfx ? this.parseOfx(conteudoTexto) : this.parseCsv(conteudoTexto, banco.id);

    return {
      itens,
      banco,
      formato,
    };
  }

  /**
   * Identifica o formato (OFX ou CSV) e realiza a extração dos itens (Compatibilidade retroativa)
   */
  static parse(conteudoTexto: string, nomeArquivo: string): ItemExtratoBruto[] {
    return this.parseComDiagnostico(conteudoTexto, nomeArquivo).itens;
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
   * Parser robusto para arquivos bancários CSV (vírgula, ponto-e-vírgula ou tab) com suporte a presets
   */
  static parseCsv(conteudo: string, bancoId?: BancoPresetId): ItemExtratoBruto[] {
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

    // Detecção específica para extratos de cartão Nubank (date, category, title, amount)
    const isNubankCard =
      (bancoId === 'nubank' || colunas.includes('category')) &&
      colunas.includes('amount') &&
      colunas.includes('title');

    // Detecção de colunas separadas de Débito e Crédito (ex: Bradesco)
    const idxCredito = colunas.findIndex((c) => c.includes('credito') || c.includes('entrada'));
    const idxDebito = colunas.findIndex((c) => c.includes('debito') || c.includes('saida'));
    const temColunasSeparadas = idxCredito !== -1 && idxDebito !== -1 && idxValor === -1;

    // Fallbacks padrão caso não encontre cabeçalhos claros
    if (idxData === -1) idxData = 0;
    if (idxDescricao === -1) idxDescricao = 1;
    if (idxValor === -1 && !temColunasSeparadas) idxValor = 2;

    const itens: ItemExtratoBruto[] = [];

    for (let i = 1; i < linhas.length; i++) {
      const colunasLinha = this.quebrarLinhaCsv(linhas[i], delimitador);
      if (colunasLinha.length <= Math.max(idxData, idxDescricao)) continue;

      const dataRaw = colunasLinha[idxData];
      const descRaw = colunasLinha[idxDescricao];
      const dataFormatada = this.normalizarData(dataRaw);
      if (!dataFormatada) continue;

      // Caso 1: Extrato com colunas separadas Crédito/Débito (Bradesco)
      if (temColunasSeparadas) {
        const valCredito = colunasLinha[idxCredito] ? this.normalizarValor(colunasLinha[idxCredito]).valor : 0;
        const valDebito = colunasLinha[idxDebito] ? this.normalizarValor(colunasLinha[idxDebito]).valor : 0;

        if (valDebito > 0) {
          itens.push({
            data: dataFormatada,
            descricao: descRaw || 'Despesa bancária',
            valor: valDebito,
            tipo: 'despesa',
          });
        } else if (valCredito > 0) {
          itens.push({
            data: dataFormatada,
            descricao: descRaw || 'Receita bancária',
            valor: valCredito,
            tipo: 'receita',
          });
        }
        continue;
      }

      // Caso 2: Cartão de Crédito Nubank (amount positivo = despesa, negativo = pagamento/estorno)
      if (isNubankCard && idxValor !== -1 && colunasLinha.length > idxValor) {
        const valRaw = colunasLinha[idxValor].replace(/["'R$\s]/g, '').replace(',', '.');
        const num = parseFloat(valRaw);
        if (isNaN(num) || num === 0) continue;

        const tipo: TipoTransacao = num > 0 ? 'despesa' : 'receita';
        itens.push({
          data: dataFormatada,
          descricao: descRaw || (tipo === 'receita' ? 'Pagamento de fatura' : 'Compra no cartão'),
          valor: Math.abs(num),
          tipo,
        });
        continue;
      }

      // Caso 3: Padrão geral com coluna única de valor
      if (idxValor !== -1 && colunasLinha.length > idxValor) {
        const valorRaw = colunasLinha[idxValor];
        const valorObj = this.normalizarValor(valorRaw);
        if (valorObj.valor === 0) continue;

        itens.push({
          data: dataFormatada,
          descricao: descRaw || (valorObj.tipo === 'receita' ? 'Receita extrato' : 'Despesa extrato'),
          valor: valorObj.valor,
          tipo: valorObj.tipo,
        });
      }
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
