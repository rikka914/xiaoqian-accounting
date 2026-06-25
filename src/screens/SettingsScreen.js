// ============================================================
// SettingsScreen.js — 预算设置页面
// 职责：
//   1. 让用户填写月收入、储蓄目标、当前存款
//   2. 校验输入合理性
//   3. 保存到数据库
// ============================================================

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { AppContext } from '../../App';
import { getSettings, updateSettings } from '../database/database';

export default function SettingsScreen({ navigation }) {
  const { setSettings, triggerRefresh } = useContext(AppContext);

  // --- 表单状态 ---
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [savingGoal, setSavingGoal] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [loading, setLoading] = useState(true);
  // loading: 进入页面时先从数据库加载已有设置，加载完前显示"加载中"
  const [saving, setSaving] = useState(false);

  // --- 加载已有设置 ---
  // 进入页面时，从数据库读取已有设置并填入表单
  useEffect(() => {
    // 这里用了一种叫 IIFE 的写法：
    // (async () => { ... })() —— 定义一个异步函数然后立刻调用它
    // 因为 useEffect 的回调本身不能是 async，所以包一层
    (async () => {
      try {
        const data = await getSettings();
        if (data) {
          // 把数据库里的数字转成字符串填入输入框
          // String() 转字符串（输入框 value 要求是字符串类型）
          setMonthlyIncome(String(data.monthlyIncome || ''));
          setSavingGoal(String(data.savingGoal || ''));
          setCurrentBalance(String(data.currentBalance || ''));
          // || '': 如果值为 0 或空，显示空字符串
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      } finally {
        setLoading(false);
        // 无论成功失败，都结束 loading 状态
      }
    })();
  }, []);
  // ↑ 空数组 = 只在进入页面时执行一次

  // --- 保存设置 ---
  const handleSave = async () => {
    // 输入校验：字符串转数字
    const incomeNum = parseFloat(monthlyIncome) || 0;
    // parseFloat 转数字，|| 0 表示如果转出来是 NaN 就当 0
    const goalNum = parseFloat(savingGoal) || 0;
    const balanceNum = parseFloat(currentBalance) || 0;

    // 储蓄目标不能为负数
    if (goalNum < 0) {
      Alert.alert('提示', '储蓄目标不能为负数');
      return;
    }

    // 合理性检查：不能存得比挣的还多
    if (incomeNum > 0 && goalNum > incomeNum) {
      Alert.alert('提示', '储蓄目标不能超过月收入哦～');
      return;
    }

    setSaving(true);

    try {
      // 写入数据库
      await updateSettings({
        monthlyIncome: incomeNum,
        savingGoal: goalNum,
        currentBalance: balanceNum,
      });

      // 同步更新全局共享状态（其他页面能立刻拿到新值）
      setSettings({
        monthlyIncome: incomeNum,
        savingGoal: goalNum,
        currentBalance: balanceNum,
      });

      // 通知首页用新设置重新计算预算
      triggerRefresh();

      Alert.alert('成功', '预算设置已保存', [
        { text: '好的', onPress: () => navigation.goBack() },
        //                         ↑ 点"好的"后返回首页
      ]);
    } catch (error) {
      console.error('保存设置失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 加载中状态：显示加载提示而不是表单
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView>
        {/* ========== 说明卡片 ========== */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 填写收入和储蓄目标后，小千会自动帮你计算每天可以花多少钱。
            {'\n'}无收入的用户，可以只填「当前存款」和「储蓄目标」。
          </Text>
        </View>

        {/* ========== 月收入 ========== */}
        <Text style={styles.label}>月收入 (选填)</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：8000"
          placeholderTextColor="#CCC"
          keyboardType="decimal-pad"
          value={monthlyIncome}
          onChangeText={setMonthlyIncome}
        />
        <Text style={styles.hint}>
          填写税后实际到手收入。无固定收入可留空。
        </Text>

        {/* ========== 储蓄目标 ========== */}
        <Text style={styles.label}>储蓄目标 *必填</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：2000"
          placeholderTextColor="#CCC"
          keyboardType="decimal-pad"
          value={savingGoal}
          onChangeText={setSavingGoal}
        />
        <Text style={styles.hint}>
          每月想存多少钱？系统会用「收入 - 储蓄目标」算出可花额度。
        </Text>

        {/* ========== 当前存款 ========== */}
        <Text style={styles.label}>当前存款 (无收入用户填写)</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：50000"
          placeholderTextColor="#CCC"
          keyboardType="decimal-pad"
          value={currentBalance}
          onChangeText={setCurrentBalance}
        />
        <Text style={styles.hint}>
          如果无固定月收入，填写当前存款总额，系统会按剩余天数均摊每日额度。
        </Text>

        {/* ========== 保存按钮 ========== */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? '保存中...' : '💾 保存设置'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#E8F4FD',
    // 浅蓝色提示背景
    margin: 16,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90D9',
    // 左侧蓝色竖条，视觉上像"提示卡片"
  },
  infoText: {
    fontSize: 14,
    color: '#2C5F8A',
    lineHeight: 22,
    // 行高 22，让文字行与行之间不拥挤
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 10,
    fontSize: 18,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 16,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#4A90D9',
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#A0C4E8',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
