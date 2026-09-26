import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Lógica canônica de parcelamento do transactionsRepo
 */
function calcularParcelas(valorTotal: number, numeroParcelas: number) {
  if (numeroParcelas <= 1) {
    return [valorTotal];
  }

  const valorParcelaBase = Math.floor((valorTotal / numeroParcelas) * 100) / 100;
  const diferencaCentavos = Math.round((valorTotal - valorParcelaBase * numeroParcelas) * 100) / 100;
  const primeiraParcelaValor = Math.round((valorParcelaBase + diferencaCentavos) * 100) / 100;

  const parcelas: number[] = [];
  for (let p = 1; p <= numeroParcelas; p++) {
    parcelas.push(p === 1 ? primeiraParcelaValor : valorParcelaBase);
  }
  return parcelas;
}

describe('Installments - Divisão Aritmética de Parcelas e Centavos', () => {
  it('deve dividir R$ 100 em 3 parcelas sem perder nenhum centavo na soma', () => {
    const parcelas = calcularParcelas(100, 3);
    assert.strictEqual(parcelas.length, 3);
    assert.strictEqual(parcelas[0], 33.34); // Diferença de centavo na 1ª parcela
    assert.strictEqual(parcelas[1], 33.33);
    assert.strictEqual(parcelas[2], 33.33);

    const soma = Math.round(parcelas.reduce((acc, v) => acc + v, 0) * 100) / 100;
    assert.strictEqual(soma, 100);
  });

  it('deve dividir R$ 1000 em 12 parcelas sem perder centavos', () => {
    const parcelas = calcularParcelas(1000, 12);
    assert.strictEqual(parcelas.length, 12);
    // 1000 / 12 = 83.3333... -> base: 83.33 -> 83.33 * 12 = 999.96 -> sobra 0.04 -> 1a parcela = 83.37
    assert.strictEqual(parcelas[0], 83.37);
    assert.strictEqual(parcelas[1], 83.33);

    const soma = Math.round(parcelas.reduce((acc, v) => acc + v, 0) * 100) / 100;
    assert.strictEqual(soma, 1000);
  });

  it('deve retornar valor único quando parcelas for 1', () => {
    const parcelas = calcularParcelas(250.75, 1);
    assert.deepStrictEqual(parcelas, [250.75]);
  });
});
