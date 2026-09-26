import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ResumoFinanceiro,
  RankingCategoria,
  AnaliseEssencialVsEstilo,
  Transacao,
  LancamentoRecorrente,
} from '../types';
import { formatarMoeda, formatarDataBr, getNomeMesExtenso } from '../utils/formatters';

interface DadosRelatorioPdf {
  mesAno: string;
  resumo: ResumoFinanceiro;
  ranking: RankingCategoria[];
  analiseEssencial: AnaliseEssencialVsEstilo | null;
  transacoes: Transacao[];
  recorrentes?: LancamentoRecorrente[];
}

export class PdfReportService {
  static async gerarECompartilhar(dados: DadosRelatorioPdf): Promise<void> {
    const html = this.construirHtml(dados);
    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Relatório Mensal - ${dados.mesAno}`,
        UTI: 'com.adobe.pdf',
      });
    }
  }

  private static construirHtml(dados: DadosRelatorioPdf): string {
    const { mesAno, resumo, ranking, analiseEssencial, transacoes } = dados;

    const [anoStr, mesStr] = mesAno.split('-');
    const nomeMes = getNomeMesExtenso(parseInt(mesStr, 10));
    const tituloPeriodo = `${nomeMes} de ${anoStr}`;
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const taxaEconomia =
      resumo.receitasRealizadas > 0
        ? ((resumo.receitasRealizadas - resumo.despesasRealizadas) / resumo.receitasRealizadas) * 100
        : 0;

    const linhasRanking = ranking.map((cat) => `
      <tr>
        <td style="padding: 9px 12px; border-bottom: 1px solid #E5E7EB; font-weight: 500;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${cat.cor}; margin-right: 6px;"></span>
          ${cat.nome}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563; text-transform: capitalize;">
          ${cat.tipoGasto === 'essencial' ? 'Essencial' : 'Estilo de vida'}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600; color: #111827;">
          ${formatarMoeda(cat.total)}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #4B5563;">
          ${cat.percentual.toFixed(1)}%
        </td>
      </tr>
    `).join('');

    const linhasTransacoes = transacoes.slice(0, 80).map((t) => {
      const isDespesa = t.tipo === 'despesa';
      return `
        <tr>
          <td style="padding: 7px 10px; border-bottom: 1px solid #F3F4F6; font-size: 11px; color: #6B7280;">
            ${formatarDataBr(t.data)}
          </td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #F3F4F6; font-size: 11px; font-weight: 500; color: #1F2937;">
            ${t.descricao || 'Sem descrição'}
          </td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #F3F4F6; font-size: 11px; color: #4B5563;">
            ${t.categoria_nome || '-'}
          </td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #F3F4F6; font-size: 11px; text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; ${
              t.pago === 0 ? 'background: #FEF3C7; color: #B45309;' : 'background: #DEF7EC; color: #03543F;'
            }">
              ${t.pago === 0 ? 'Pendente' : 'Pago'}
            </span>
          </td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #F3F4F6; font-size: 11px; text-align: right; font-weight: 600; color: ${
            isDespesa ? '#DC2626' : '#059669'
          };">
            ${isDespesa ? '-' : '+'} ${formatarMoeda(t.valor)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório Financeiro - ${tituloPeriodo}</title>
        <style>
          @page {
            size: A4;
            margin: 14mm 12mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            color: #1F2937;
            background: #FFFFFF;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .cabecalho {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #10B981;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .app-nome {
            font-size: 14px;
            font-weight: 700;
            color: #059669;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .titulo {
            font-size: 22px;
            font-weight: 800;
            color: #111827;
            margin: 4px 0 2px 0;
          }
          .subtitulo {
            font-size: 12px;
            color: #6B7280;
          }
          .meta-emissao {
            text-align: right;
            font-size: 11px;
            color: #6B7280;
          }
          .grid-resumo {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 18px;
          }
          .card-resumo {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 10px 12px;
          }
          .card-resumo .rotulo {
            font-size: 11px;
            color: #6B7280;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .card-resumo .valor {
            font-size: 16px;
            font-weight: 700;
          }
          .secao-titulo {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
            margin-top: 16px;
            margin-bottom: 8px;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          th {
            background: #F3F4F6;
            color: #374151;
            font-size: 11px;
            font-weight: 700;
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid #D1D5DB;
          }
          .rodape {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #9CA3AF;
          }
        </style>
      </head>
      <body>
        <div class="cabecalho">
          <div>
            <div class="app-nome">Finanças Offline</div>
            <div class="titulo">Fechamento Mensal</div>
            <div class="subtitulo">${tituloPeriodo}</div>
          </div>
          <div class="meta-emissao">
            <div><strong>Emissão:</strong> ${dataEmissao}</div>
            <div>Armazenamento local seguro</div>
          </div>
        </div>

        <!-- Cards de Resumo Executivo -->
        <div class="grid-resumo">
          <div class="card-resumo">
            <div class="rotulo">Receitas recebidas</div>
            <div class="valor" style="color: #059669;">${formatarMoeda(resumo.receitasRealizadas)}</div>
          </div>
          <div class="card-resumo">
            <div class="rotulo">Despesas pagas</div>
            <div class="valor" style="color: #DC2626;">${formatarMoeda(resumo.despesasRealizadas)}</div>
          </div>
          <div class="card-resumo">
            <div class="rotulo">Saldo em caixa</div>
            <div class="valor" style="color: ${resumo.saldoRealizado >= 0 ? '#111827' : '#DC2626'};">
              ${formatarMoeda(resumo.saldoRealizado)}
            </div>
          </div>
          <div class="card-resumo">
            <div class="rotulo">Taxa de poupança</div>
            <div class="valor" style="color: ${taxaEconomia >= 0 ? '#059669' : '#DC2626'};">
              ${taxaEconomia.toFixed(1)}%
            </div>
          </div>
        </div>

        ${analiseEssencial ? `
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-around;">
            <div>
              <span style="color: #6B7280; font-size: 11px;">Gastos essenciais:</span>
              <strong style="color: #059669; font-size: 13px; margin-left: 6px;">${formatarMoeda(analiseEssencial.totalEssencial)} (${analiseEssencial.percentualEssencial.toFixed(0)}%)</strong>
            </div>
            <div>
              <span style="color: #6B7280; font-size: 11px;">Estilo de vida e lazer:</span>
              <strong style="color: #D97706; font-size: 13px; margin-left: 6px;">${formatarMoeda(analiseEssencial.totalEstiloDeVida)} (${analiseEssencial.percentualEstiloDeVida.toFixed(0)}%)</strong>
            </div>
          </div>
        ` : ''}

        <!-- Tabela de Categorias -->
        <div class="secao-titulo">Despesas por categoria</div>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Classificação</th>
              <th style="text-align: right;">Total pago</th>
              <th style="text-align: right;">Participação</th>
            </tr>
          </thead>
          <tbody>
            ${linhasRanking.length > 0 ? linhasRanking : '<tr><td colspan="4" style="text-align: center; padding: 12px; color: #9CA3AF;">Nenhuma despesa registrada no mês.</td></tr>'}
          </tbody>
        </table>

        <!-- Tabela de Transações -->
        <div class="secao-titulo">Lançamentos detalhados do mês (${transacoes.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 75px;">Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th style="text-align: center; width: 65px;">Status</th>
              <th style="text-align: right; width: 95px;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTransacoes.length > 0 ? linhasTransacoes : '<tr><td colspan="5" style="text-align: center; padding: 12px; color: #9CA3AF;">Nenhum lançamento registrado no mês.</td></tr>'}
          </tbody>
        </table>

        <div class="rodape">
          <div>Documento gerado localmente pelo aplicativo Finanças Offline.</div>
          <div>100% offline • Seus dados nunca foram transmitidos pela internet.</div>
        </div>
      </body>
      </html>
    `;
  }
}
