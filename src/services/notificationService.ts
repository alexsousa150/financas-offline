import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatarMoeda } from '../utils/formatters';

// Configura comportamento padrão das notificações locais quando recebidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  /**
   * Solicita permissão para notificações locais no Android
   */
  static async solicitarPermissao(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('contas-vencimento', {
          name: 'Lembretes de Contas',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });
      }

      return finalStatus === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Agenda um lembrete local para o dia de vencimento da conta às 09:00 da manhã
   */
  static async agendarLembreteVencimento(
    descricao: string,
    valor: number,
    dataVencimentoIso: string
  ): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const temPermissao = await this.solicitarPermissao();
      if (!temPermissao) return null;

      const [ano, mes, dia] = dataVencimentoIso.split('-').map(Number);
      const dataAlvo = new Date(ano, mes - 1, dia, 9, 0, 0); // 09:00 da manhã

      // Se a data já passou, não agenda
      if (dataAlvo.getTime() <= Date.now()) {
        return null;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Conta Vencendo Hoje!',
          body: `${descricao || 'Pagamento'} no valor de ${formatarMoeda(valor)} vence hoje.`,
          data: { dataVencimentoIso, valor },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dataAlvo,
          channelId: 'contas-vencimento',
        },
      });

      return id;
    } catch (e) {
      console.warn('Não foi possível agendar notificação local:', e);
      return null;
    }
  }
}
