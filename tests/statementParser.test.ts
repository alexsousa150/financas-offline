import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StatementParser } from '../src/services/statementParser.ts';

const SAMPLE_OFX = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<DTSTART>20260901
<DTEND>20260926
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260915120000[-03:EST]
<TRNAMT>-125.80
<FITID>202609150001
<MEMO>SUPERMERCADO DIA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260905120000[-03:EST]
<TRNAMT>4500.00
<FITID>202609050002
<NAME>TED SALARIO EMPRESA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260920
<TRNAMT>-32.50
<FITID>202609200003
<MEMO>FARMACIA &amp; DROGASIL
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

const SAMPLE_CSV_SEMICOLON = `Data;Descricao;Valor
15/09/2026;MERCADO EXTRA;-150,00
05/09/2026;SALARIO;3200,50
22/09/2026;POSTO IPIRANGA;-85,25
`;

describe('StatementParser - Processamento de Extratos OFX e CSV', () => {
  it('deve extrair transações de arquivo OFX com valores, datas e tipos corretos', () => {
    const itens = StatementParser.parseOfx(SAMPLE_OFX);
    assert.strictEqual(itens.length, 3);

    // Item 1: Despesa
    assert.strictEqual(itens[0].descricao, 'SUPERMERCADO DIA');
    assert.strictEqual(itens[0].valor, 125.8);
    assert.strictEqual(itens[0].tipo, 'despesa');
    assert.strictEqual(itens[0].data, '2026-09-15');
    assert.strictEqual(itens[0].fitId, '202609150001');

    // Item 2: Receita
    assert.strictEqual(itens[1].descricao, 'TED SALARIO EMPRESA');
    assert.strictEqual(itens[1].valor, 4500);
    assert.strictEqual(itens[1].tipo, 'receita');
    assert.strictEqual(itens[1].data, '2026-09-05');
    assert.strictEqual(itens[1].fitId, '202609050002');

    // Item 3: Entidades HTML decodificadas (&amp; -> &)
    assert.strictEqual(itens[2].descricao, 'FARMACIA & DROGASIL');
    assert.strictEqual(itens[2].valor, 32.5);
    assert.strictEqual(itens[2].tipo, 'despesa');
  });

  it('deve extrair transações de CSV com delimitador ponto-e-vírgula e vírgula decimal', () => {
    const itens = StatementParser.parseCsv(SAMPLE_CSV_SEMICOLON);
    assert.strictEqual(itens.length, 3);

    assert.strictEqual(itens[0].descricao, 'MERCADO EXTRA');
    assert.strictEqual(itens[0].valor, 150);
    assert.strictEqual(itens[0].tipo, 'despesa');
    assert.strictEqual(itens[0].data, '2026-09-15');

    assert.strictEqual(itens[1].descricao, 'SALARIO');
    assert.strictEqual(itens[1].valor, 3200.5);
    assert.strictEqual(itens[1].tipo, 'receita');
  });

  it('deve despachar corretamente entre OFX e CSV pelo método parse', () => {
    const itensOfx = StatementParser.parse(SAMPLE_OFX, 'extrato_nubank.ofx');
    assert.strictEqual(itensOfx.length, 3);

    const itensCsv = StatementParser.parse(SAMPLE_CSV_SEMICOLON, 'extrato_itau.csv');
    assert.strictEqual(itensCsv.length, 3);
  });

  it('deve identificar presets dos principais bancos brasileiros (Nubank, Inter, Itaú, Bradesco, BB, Caixa, C6)', () => {
    // Nubank via nome e conteúdo
    const bNu1 = StatementParser.detectarBanco('date,category,title,amount\n2026-09-01,comida,ifood,55.00', 'fatura.csv');
    assert.strictEqual(bNu1.id, 'nubank');
    assert.strictEqual(bNu1.nome, 'Nubank');

    // Banco Inter via OFX ORG
    const bInter = StatementParser.detectarBanco('<OFX><ORG>Banco Inter S.A.</ORG></OFX>', 'extrato.ofx');
    assert.strictEqual(bInter.id, 'inter');

    // Itaú via FID
    const bItau = StatementParser.detectarBanco('<OFX><FID>341</FID></OFX>', 'arquivo.ofx');
    assert.strictEqual(bItau.id, 'itau');

    // Bradesco via colunas de débito e crédito
    const bBradesco = StatementParser.detectarBanco('Data;Historico;Credito;Debito\n15/09/2026;PIX;;50,00', 'extrato.csv');
    assert.strictEqual(bBradesco.id, 'bradesco');

    // Banco do Brasil via nome do arquivo
    const bBB = StatementParser.detectarBanco('Data,Historico,Valor\n10/09/2026,PIX,-30.00', 'bb_extrato_09.csv');
    assert.strictEqual(bBB.id, 'bb');

    // Caixa Econômica via FID
    const bCaixa = StatementParser.detectarBanco('<OFX><FID>104</FID></OFX>', 'mov.ofx');
    assert.strictEqual(bCaixa.id, 'caixa');

    // C6 Bank via nome
    const bC6 = StatementParser.detectarBanco('data,valor,descricao\n2026-09-01,-20,Uber', 'c6_extrato.csv');
    assert.strictEqual(bC6.id, 'c6');

    // Fallback genérico
    const bGenerico = StatementParser.detectarBanco('data,valor,descricao\n2026-09-01,-20,Uber', 'extrato_qualquer.csv');
    assert.strictEqual(bGenerico.id, 'generico');
  });

  it('deve processar extrato de cartão Nubank onde amount positivo representa despesa', () => {
    const csvNubankCartao = `date,category,title,amount
2026-09-10,transporte,Uber,24.90
2026-09-12,restaurante,iFood,68.50
2026-09-15,outros,Pagamento de fatura,-500.00
`;
    const resultado = StatementParser.parseComDiagnostico(csvNubankCartao, 'nubank_cartao.csv');
    assert.strictEqual(resultado.banco.id, 'nubank');
    assert.strictEqual(resultado.formato, 'CSV');
    assert.strictEqual(resultado.itens.length, 3);

    // Compra no cartão (amount 24.90) deve ser despesa
    assert.strictEqual(resultado.itens[0].descricao, 'Uber');
    assert.strictEqual(resultado.itens[0].valor, 24.9);
    assert.strictEqual(resultado.itens[0].tipo, 'despesa');

    // Pagamento de fatura (amount -500.00) deve ser receita/crédito
    assert.strictEqual(resultado.itens[2].descricao, 'Pagamento de fatura');
    assert.strictEqual(resultado.itens[2].valor, 500);
    assert.strictEqual(resultado.itens[2].tipo, 'receita');
  });

  it('deve processar extrato Bradesco com colunas separadas de Débito e Crédito', () => {
    const csvBradesco = `Data;Historico;Docto;Credito;Debito;Saldo
14/09/2026;TRANSFERENCIA PIX RECEBIDA;12345;850,00;;1850,00
15/09/2026;PAGAMENTO CONTA ENERGIA;67890;;120,40;1729,60
`;
    const resultado = StatementParser.parseComDiagnostico(csvBradesco, 'extrato_bradesco.csv');
    assert.strictEqual(resultado.banco.id, 'bradesco');
    assert.strictEqual(resultado.itens.length, 2);

    assert.strictEqual(resultado.itens[0].descricao, 'TRANSFERENCIA PIX RECEBIDA');
    assert.strictEqual(resultado.itens[0].valor, 850);
    assert.strictEqual(resultado.itens[0].tipo, 'receita');

    assert.strictEqual(resultado.itens[1].descricao, 'PAGAMENTO CONTA ENERGIA');
    assert.strictEqual(resultado.itens[1].valor, 120.4);
    assert.strictEqual(resultado.itens[1].tipo, 'despesa');
  });
});
