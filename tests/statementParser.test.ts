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
});
