import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export class AppHaptics {
  static async toqueLeve(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Ignora silenciosamente caso o hardware não suporte
    }
  }

  static async toqueMedio(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      // Ignora
    }
  }

  static async toqueSucesso(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Ignora
    }
  }

  static async toqueAviso(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      // Ignora
    }
  }

  static async toqueSelecao(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
    } catch {
      // Ignora
    }
  }
}
