import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { formatarMoeda } from '../utils/formatters';

export interface FatiaGrafico {
  nome: string;
  valor: number;
  cor: string;
  percentual: number;
}

interface DonutChartProps {
  dados: FatiaGrafico[];
  tamanho?: number;
  espessura?: number;
  tituloCentro?: string;
  subtituloCentro?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  dados,
  tamanho = 220,
  espessura = 28,
  tituloCentro,
  subtituloCentro = 'Total',
}) => {
  const { theme } = useTheme();

  const total = dados.reduce((acc, item) => acc + item.valor, 0);

  if (total === 0 || dados.length === 0) {
    return (
      <View style={[styles.containerVazio, { height: tamanho }]}>
        <Text style={[styles.textoVazio, { color: theme.textMuted }]}>
          Nenhum gasto registrado neste período
        </Text>
      </View>
    );
  }

  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const centro = tamanho / 2;

  // Calcula os offsets para o strokeDasharray de cada fatia
  let acumuladoPercentual = 0;

  return (
    <View style={styles.container}>
      <View style={{ width: tamanho, height: tamanho, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={tamanho} height={tamanho}>
          <G rotation="-90" origin={`${centro}, ${centro}`}>
            {/* Círculo de fundo */}
            <Circle
              cx={centro}
              cy={centro}
              r={raio}
              stroke={theme.cardBorder}
              strokeWidth={espessura}
              fill="transparent"
            />
            {dados.map((fatia, index) => {
              if (fatia.percentual <= 0) return null;

              const tamanhoFatia = (fatia.percentual / 100) * circunferencia;
              const espacoRestante = circunferencia - tamanhoFatia;
              const offset = -((acumuladoPercentual / 100) * circunferencia);

              acumuladoPercentual += fatia.percentual;

              return (
                <Circle
                  key={`slice-${index}-${fatia.nome}`}
                  cx={centro}
                  cy={centro}
                  r={raio}
                  stroke={fatia.cor}
                  strokeWidth={espessura}
                  strokeDasharray={`${tamanhoFatia} ${espacoRestante}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              );
            })}
          </G>
        </Svg>

        {/* Informação no centro do Donut */}
        <View style={styles.centroDonut} pointerEvents="none">
          <Text style={[styles.subtituloCentro, { color: theme.textSecondary }]}>
            {subtituloCentro}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tituloCentro, { color: theme.text }]}
          >
            {tituloCentro || formatarMoeda(total)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  containerVazio: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  textoVazio: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  centroDonut: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 130,
  },
  subtituloCentro: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tituloCentro: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
});
