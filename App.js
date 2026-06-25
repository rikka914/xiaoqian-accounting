// ============================================================
// App.js — 应用入口，整个程序从这里启动
// 职责：
//   1. 初始化数据库
//   2. 等数据库就绪后才渲染页面
//   3. 配置页面导航
//   4. 提供全局状态（预算数据在所有页面间共享）
// ============================================================

import React, { useState, useEffect, createContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
// ActivityIndicator — 旋转的加载圈圈

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { initDatabase } from './src/database/database';

const Stack = createNativeStackNavigator();
export const AppContext = createContext(null);

export default function App() {
  // ---- 数据库就绪状态 ----
  // 只有数据库初始化完才渲染页面，避免 db 为 null 时报错
  const [dbReady, setDbReady] = useState(false);

  // ---- 全局状态 ----
  const [refreshKey, setRefreshKey] = useState(0);
  const [settings, setSettings] = useState({
    monthlyIncome: 0,
    savingGoal: 0,
    currentBalance: 0,
  });

  // ---- 初始化数据库 ----
  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
    // 等 initDatabase 完成后再把 dbReady 设为 true
  }, []);

  // ---- 数据库未就绪：显示加载页 ----
  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>启动中...</Text>
      </View>
    );
  }

  // ---- 共享数据 ----
  const contextValue = {
    settings,
    setSettings,
    refreshKey,
    triggerRefresh: () => setRefreshKey(prev => prev + 1),
  };

  // ---- 渲染导航 ----
  return (
    <AppContext.Provider value={contextValue}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#4A90D9' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: '小千记帐' }}
          />
          <Stack.Screen
            name="AddExpense"
            component={AddExpenseScreen}
            options={{ title: '记一笔' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: '预算设置' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});
