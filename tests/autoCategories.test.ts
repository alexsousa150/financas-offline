import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sugerirCategoriaPorDescricao } from '../src/utils/autoCategories.ts';
import type { Categoria } from '../src/types/index.ts';

const CATEGORIAS_MOCK: Categoria[] = [
  { id: 1, nome: 'Alimentação', icone: 'fast-food-outline', cor: '#FF6B6B', limite_mensal: 1200, tipo_gasto: 'essencial' },
  { id: 2, nome: 'Transporte', icone: 'car-sport-outline', cor: '#4D96FF', limite_mensal: 500, tipo_gasto: 'essencial' },
  { id: 3, nome: 'Moradia', icone: 'home-outline', cor: '#FF922B', limite_mensal: 1500, tipo_gasto: 'essencial' },
  { id: 4, nome: 'Saúde', icone: 'fitness-outline', cor: '#20C997', limite_mensal: 300, tipo_gasto: 'essencial' },
  { id: 5, nome: 'Lazer', icone: 'game-controller-outline', cor: '#9B51E0', limite_mensal: 400, tipo_gasto: 'estilo_de_vida' },
  { id: 6, nome: 'Salário / Renda', icone: 'wallet-outline', cor: '#51CF66', limite_mensal: null, tipo_gasto: 'essencial' },
  { id: 7, nome: 'Outros', icone: 'ellipsis-horizontal-circle-outline', cor: '#868E96', limite_mensal: null, tipo_gasto: 'estilo_de_vida' },
];

describe('AutoCategories - Classificação Inteligente de Extratos', () => {
  it('deve classificar compras de delivery e restaurantes como Alimentação', () => {
    assert.strictEqual(sugerirCategoriaPorDescricao('IFOOD *RESTAURANTE SAO PAULO', CATEGORIAS_MOCK, 'despesa'), 1);
    assert.strictEqual(sugerirCategoriaPorDescricao('MC DONALD DRIVE THRU', CATEGORIAS_MOCK, 'despesa'), 1);
    assert.strictEqual(sugerirCategoriaPorDescricao('SUPERMERCADO PAO DE ACUCAR', CATEGORIAS_MOCK, 'despesa'), 1);
  });

  it('deve classificar aplicativos de corrida e postos de combustível como Transporte', () => {
    assert.strictEqual(sugerirCategoriaPorDescricao('UBER *TRIP BRASIL', CATEGORIAS_MOCK, 'despesa'), 2);
    assert.strictEqual(sugerirCategoriaPorDescricao('99APP CORRIDA', CATEGORIAS_MOCK, 'despesa'), 2);
    assert.strictEqual(sugerirCategoriaPorDescricao('POSTO IPIRANGA GASOLINA', CATEGORIAS_MOCK, 'despesa'), 2);
  });

  it('deve classificar contas de consumo como Moradia', () => {
    assert.strictEqual(sugerirCategoriaPorDescricao('SABESP AGUA', CATEGORIAS_MOCK, 'despesa'), 3);
    assert.strictEqual(sugerirCategoriaPorDescricao('ENEL LUZ ENERGIA', CATEGORIAS_MOCK, 'despesa'), 3);
    assert.strictEqual(sugerirCategoriaPorDescricao('PAGAMENTO CONDOMINIO EDIFICIO', CATEGORIAS_MOCK, 'despesa'), 3);
  });

  it('deve classificar farmácias e clínicas como Saúde', () => {
    assert.strictEqual(sugerirCategoriaPorDescricao('DROGASIL FILIAL 12', CATEGORIAS_MOCK, 'despesa'), 4);
    assert.strictEqual(sugerirCategoriaPorDescricao('DROGA RAIA SP', CATEGORIAS_MOCK, 'despesa'), 4);
  });

  it('deve classificar assinaturas e entretenimento como Lazer', () => {
    assert.strictEqual(sugerirCategoriaPorDescricao('NETFLIX.COM MENSALIDADE', CATEGORIAS_MOCK, 'despesa'), 5);
    assert.strictEqual(sugerirCategoriaPorDescricao('SPOTIFY BRASIL', CATEGORIAS_MOCK, 'despesa'), 5);
    assert.strictEqual(sugerirCategoriaPorDescricao('STEAM GAMES PURCHASE', CATEGORIAS_MOCK, 'despesa'), 5);
  });

  it('deve priorizar Salário / Renda para receitas com termos típicos', () => {
    assert.strictEqual(sugerirCategoriaPorDescricao('PAGTO SALARIO EMPRESA XYZ', CATEGORIAS_MOCK, 'receita'), 6);
    assert.strictEqual(sugerirCategoriaPorDescricao('FOLHA DE PAGAMENTO', CATEGORIAS_MOCK, 'receita'), 6);
  });

  it('deve retornar categoria Outros como fallback para descrições desconhecidas', () => {
    assert.strictEqual(sugerirCategoriaPorDescricao('TRANSF TED 99881122 XPT', CATEGORIAS_MOCK, 'despesa'), 7);
  });
});
