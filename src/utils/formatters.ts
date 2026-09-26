/**
 * Utilitários de formatação para moeda brasileira (BRL), datas e porcentagens.
 */

export function formatarMoeda(valor: number): string {
  if (isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatarDataBr(dataIso: string): string {
  if (!dataIso) return '';
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataIso;
}

export function formatarDataExtenso(dataIso: string): string {
  if (!dataIso) return '';
  const hoje = getDataHojeIso();
  const ontem = getDataOntemIso();

  if (dataIso === hoje) return 'Hoje';
  if (dataIso === ontem) return 'Ontem';

  const [ano, mes, dia] = dataIso.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesIndex = parseInt(mes, 10) - 1;
  return `${dia} de ${meses[mesIndex] || mes} de ${ano}`;
}

export function getDataHojeIso(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function getDataOntemIso(): string {
  const data = new Date();
  data.setDate(data.getDate() - 1);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function getMesAnoAtualIso(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

export function getNomeMesExtenso(mesNumero: number): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[mesNumero - 1] || '';
}

export function getNomeMesAno(mesAnoIso: string): string {
  const [ano, mes] = mesAnoIso.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mesIndex = parseInt(mes, 10) - 1;
  return `${meses[mesIndex] || mes} ${ano}`;
}

export function getMesAnterior(mesAnoIso: string): string {
  const [anoStr, mesStr] = mesAnoIso.split('-');
  let ano = parseInt(anoStr, 10);
  let mes = parseInt(mesStr, 10) - 1;
  if (mes < 1) {
    mes = 12;
    ano -= 1;
  }
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function getMesPosterior(mesAnoIso: string): string {
  const [anoStr, mesStr] = mesAnoIso.split('-');
  let ano = parseInt(anoStr, 10);
  let mes = parseInt(mesStr, 10) + 1;
  if (mes > 12) {
    mes = 1;
    ano += 1;
  }
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function formatarVariacao(variacao: number | null | undefined): {
  texto: string;
  tipo: 'aumento' | 'queda' | 'neutro';
} {
  if (variacao === null || variacao === undefined) {
    return { texto: 'Sem dados anteriores', tipo: 'neutro' };
  }
  if (variacao === 0) {
    return { texto: '0%', tipo: 'neutro' };
  }
  const sinal = variacao > 0 ? '+' : '';
  const texto = `${sinal}${variacao.toFixed(1)}%`;
  return {
    texto,
    tipo: variacao > 0 ? 'aumento' : 'queda',
  };
}

/**
 * Converte valor digitado no teclado em número monetário (Ex: "1234" -> 12.34)
 */
export function converterCentavosParaValor(textoCentavos: string): number {
  const digitos = textoCentavos.replace(/\D/g, '');
  if (!digitos) return 0;
  return parseFloat(digitos) / 100;
}
