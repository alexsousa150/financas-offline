import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const renderTabIcon = (
    focused: boolean,
    color: any,
    iconFocused: keyof typeof Ionicons.glyphMap,
    iconOutline: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={styles.tabIconWrapper}>
      {focused && <View style={[styles.activePillIndicator, { backgroundColor: theme.primary }]} />}
      <Ionicons name={focused ? iconFocused : iconOutline} size={21} color={color} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 8,
          height: 64 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, color, 'home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, color, 'time', 'time-outline'),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Análises',
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, color, 'pie-chart', 'pie-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: 'Importar',
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, color, 'business', 'business-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon(focused, color, 'settings', 'settings-outline'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activePillIndicator: {
    width: 22,
    height: 3,
    borderRadius: 1.5,
    position: 'absolute',
    top: -7,
  },
});
