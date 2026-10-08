import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatarMoeda,
  converterCentavosParaValor,
  formatarDataBr,
  getIntervaloMes,
  getIntervaloAno,
  getMesAnterior,
  getMesPosterior,
  formatarVariacao,
  reaisParaCentavos,
  centavosParaReais,
  somarMoeda,
  subtrairMoeda,
  multiplicarMoeda,
} from '../src/utils/formatters.ts';

describe('Formatters - Formatação Monetária e Datas', () => {
  it('deve executar aritmética monetária em centavos sem erros de float', () => {
    // 0.1 + 0.2 em float dá 0.30000000000000004
    assert.strictEqual(0.1 + 0.2 === 0.3, false); // Prova do bug de float padrão JS
    // Em centavos: 10 + 20 = 30 centavos
    assert.strictEqual(somarMoeda(10, 20), 30);

    assert.strictEqual(subtrairMoeda(10055, 3333), 6722);
    assert.strictEqual(reaisParaCentavos(99.99), 9999);
    assert.strictEqual(centavosParaReais(9999), 99.99);
    assert.strictEqual(multiplicarMoeda(3333, 3), 9999);
  });
  it('deve converter centavos digitados para valor float corretamente', () => {
    assert.strictEqual(converterCentavosParaValor('1234'), 12.34);
    assert.strictEqual(converterCentavosParaValor('50'), 0.5);
    assert.strictEqual(converterCentavosParaValor('0'), 0);
    assert.strictEqual(converterCentavosParaValor(''), 0);
    assert.strictEqual(converterCentavosParaValor('100000'), 1000);
  });

  it('deve formatar valores em moeda BRL corretamente', () => {
    const formatadoZero = formatarMoeda(0);
    assert.ok(formatadoZero.includes('0,00'));

    const formatadoPositivo = formatarMoeda(125050);
    assert.ok(formatadoPositivo.includes('1.250,50') || formatadoPositivo.includes('1250,50'));

    const formatadoNaN = formatarMoeda(NaN);
    assert.strictEqual(formatadoNaN, 'R$ 0,00');
  });

  it('deve formatar data ISO para padrão brasileiro DD/MM/AAAA', () => {
    assert.strictEqual(formatarDataBr('2026-09-26'), '26/09/2026');
    assert.strictEqual(formatarDataBr('2026-01-01'), '01/01/2026');
    assert.strictEqual(formatarDataBr(''), '');
  });

  it('deve calcular intervalo de datas indexado para consultas de mês', () => {
    const setembro = getIntervaloMes('2026-09');
    assert.strictEqual(setembro.inicio, '2026-09-01');
    assert.strictEqual(setembro.fimExclusivo, '2026-10-01');

    const dezembro = getIntervaloMes('2026-12');
    assert.strictEqual(dezembro.inicio, '2026-12-01');
    assert.strictEqual(dezembro.fimExclusivo, '2027-01-01');

    const fevereiro = getIntervaloMes('2026-02');
    assert.strictEqual(fevereiro.inicio, '2026-02-01');
    assert.strictEqual(fevereiro.fimExclusivo, '2026-03-01');
  });

  it('deve calcular intervalo de datas indexado para consultas de ano', () => {
    const ano = getIntervaloAno(2026);
    assert.strictEqual(ano.inicio, '2026-01-01');
    assert.strictEqual(ano.fimExclusivo, '2027-01-01');
  });

  it('deve calcular mês anterior e posterior com virada de ano', () => {
    assert.strictEqual(getMesAnterior('2026-01'), '2025-12');
    assert.strictEqual(getMesAnterior('2026-09'), '2026-08');

    assert.strictEqual(getMesPosterior('2026-12'), '2027-01');
    assert.strictEqual(getMesPosterior('2026-05'), '2026-06');
  });

  it('deve calcular variação percentual com tipo e sinal adequados', () => {
    const aumento = formatarVariacao(15.2);
    assert.strictEqual(aumento.texto, '+15.2%');
    assert.strictEqual(aumento.tipo, 'aumento');

    const queda = formatarVariacao(-7.5);
    assert.strictEqual(queda.texto, '-7.5%');
    assert.strictEqual(queda.tipo, 'queda');

    const neutro = formatarVariacao(0);
    assert.strictEqual(neutro.texto, '0%');
    assert.strictEqual(neutro.tipo, 'neutro');

    const nulo = formatarVariacao(null);
    assert.strictEqual(nulo.tipo, 'neutro');
  });
});
