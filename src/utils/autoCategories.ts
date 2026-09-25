import { Categoria } from '../types';

interface RegraSugestao {
  nomeCategoria: string;
  palavrasChave: string[];
}

const REGRAS_PADRAO: RegraSugestao[] = [
  {
    nomeCategoria: 'Alimentação',
    palavrasChave: [
      'IFOOD', 'RAPPI', 'AIQFOME', 'RESTAURANTE', 'REST', 'PADARIA', 'PANIFICADORA',
      'BURGER', 'MCDONALD', 'MC DONALD', 'SUBWAY', 'PIZZARIA', 'PIZZA', 'CHURRASCARIA',
      'MERCADO', 'SUPERMERCADO', 'CARREFOUR', 'PAO DE ACUCAR', 'EXTRA', 'ATACADAO',
      'ASSAI', 'DIA%', 'HORTIFRUTI', 'ACOUGUE', 'AÇOUGUE', 'CONFEITARIA', 'LANCHONETE',
      'BAR ', 'PUB ', 'BISTRÔ', 'BISTRO', 'SORVETE'
    ],
  },
  {
    nomeCategoria: 'Transporte',
    palavrasChave: [
      'UBER', '99APP', '99 TÁXI', '99 TAXI', '99 POP', 'CABIFY', 'POSTO', 'SHELL',
      'IPIRANGA', 'PETROBRAS', 'AUTO POSTO', 'GASOLINA', 'ETANOL', 'COMBUSTIVEL',
      'SEM PARAR', 'VELOE', 'CONECTCAR', 'ESTACIONAMENTO', 'ESTAC', 'ROTATIVO',
      'PEDAGIO', 'METRO', 'ONIBUS', 'PASSAGEM', 'AZUL', 'GOL', 'LATAM', 'VLT'
    ],
  },
  {
    nomeCategoria: 'Moradia',
    palavrasChave: [
      'ALUGUEL', 'CONDOMINIO', 'ENEL', 'CEMIG', 'CPFL', 'LIGHT', 'SABESP', 'COPASA',
      'SANEPAR', 'CLARO', 'VIVO', 'TIM', 'OI', 'NET VIRTUA', 'INTERNET', 'LUZ',
      'ENERGIA', 'AGUA', 'GAS', 'IPTU', 'COELBA', 'EQUATORIAL', 'COMGAS'
    ],
  },
  {
    nomeCategoria: 'Lazer',
    palavrasChave: [
      'NETFLIX', 'SPOTIFY', 'PRIME VIDEO', 'DISNEY', 'HBOMAX', 'MAX ', 'STREAMING',
      'YOUTUBE', 'STEAM', 'PLAYSTATION', 'PSN', 'XBOX', 'NINTENDO', 'CINEMA',
      'CINEMARK', 'CINEPOLIS', 'INGRESSO', 'SHOW', 'TEATRO', 'SYMPLA', 'EVENTIM'
    ],
  },
  {
    nomeCategoria: 'Saúde',
    palavrasChave: [
      'DROGASIL', 'DROGA RAIA', 'PAGUE MENOS', 'DROGARIA', 'FARMACIA', 'FARM',
      'CONSULTA', 'CLINICA', 'EXAME', 'LABORATORIO', 'DENTISTA', 'HOSPITAL',
      'UNIMED', 'AMIL', 'BRADESCO SAUDE', 'SULAMERICA', 'NOTREDAME', 'OTICA'
    ],
  },
  {
    nomeCategoria: 'Salário / Renda',
    palavrasChave: [
      'SALARIO', 'SALÁRIO', 'FOLHA', 'REMUNERACAO', 'REMUNERAÇÃO', 'PROVENTOS',
      'TED RECEBIDA', 'PIX RECEBIDO', 'PAGTO SALARIO', 'DIVIDENDOS', 'RENDIMENTO'
    ],
  },
];

/**
 * Sugere o ID da categoria com base no texto da descrição do extrato bancário
 */
export function sugerirCategoriaPorDescricao(
  descricao: string,
  categorias: Categoria[],
  tipo: 'receita' | 'despesa'
): number {
  if (!descricao) {
    const padrao = categorias.find((c) => c.nome.toLowerCase() === 'outros') || categorias[0];
    return padrao ? padrao.id : 1;
  }

  const descNormalizada = descricao
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Se for receita e houver palavras de salário/renda
  if (tipo === 'receita') {
    const catSalario = categorias.find(
      (c) => c.nome.toLowerCase().includes('salário') || c.nome.toLowerCase().includes('salario') || c.nome.toLowerCase().includes('renda')
    );
    if (catSalario) return catSalario.id;
  }

  for (const regra of REGRAS_PADRAO) {
    for (const palavra of regra.palavrasChave) {
      const palavraNorm = palavra.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      let combinou = false;
      if (palavraNorm.length <= 3) {
        // Palavras curtas precisam ser palavras completas isoladas para não dar falso positivo
        const regexPalavra = new RegExp(`(?:^|[\\s.,*\\-_/])${palavraNorm}(?:$|[\\s.,*\\-_/])`, 'i');
        combinou = regexPalavra.test(descNormalizada);
      } else {
        combinou = descNormalizada.includes(palavraNorm);
      }

      if (combinou) {
        const correspondente = categorias.find(
          (c) => c.nome.toLowerCase() === regra.nomeCategoria.toLowerCase()
        );
        if (correspondente) {
          return correspondente.id;
        }
      }
    }
  }

  // Se não encontrar nenhuma regra, tentar buscar se o próprio nome de alguma categoria existe na descrição
  for (const cat of categorias) {
    const nomeNorm = cat.nome.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (nomeNorm.length > 3 && descNormalizada.includes(nomeNorm)) {
      return cat.id;
    }
  }

  // Fallback: categoria 'Outros' ou a primeira disponível
  const catOutros = categorias.find((c) => c.nome.toLowerCase() === 'outros') || categorias[0];
  return catOutros ? catOutros.id : (categorias[0]?.id ?? 1);
}
