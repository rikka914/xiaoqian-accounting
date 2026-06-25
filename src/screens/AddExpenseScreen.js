// ============================================================
// AddExpenseScreen.js — 添加开支页面
// 职责：
//   1. 提供开支表单（金额 + 分类 + 备注）
//   2. 校验输入是否合法
//   3. 写入数据库并返回首页
// ============================================================

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  // TextInput: 文本输入框，用户在手机上打字的地方
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { AppContext } from '../../App';
import { addExpense } from '../database/database';

// ------------------------------------------------------------------
// 开支分类选项（与产品文档一致）
// ------------------------------------------------------------------
const CATEGORIES = ['早餐', '午餐', '晚餐', '奶茶', '交通', '购物', '娱乐', '其他'];

// ------------------------------------------------------------------
// 获取今天日期字符串
// ------------------------------------------------------------------
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddExpenseScreen({ navigation }) {
  // --- 从全局共享数据中取出需要的函数 ---
  const { triggerRefresh } = useContext(AppContext);
  // 只需要 triggerRefresh——保存成功后通知首页刷新

  // --- 表单状态 ---
  const [amount, setAmount] = useState('');
  // 金额：用字符串存储（方便输入框绑定），提交时再转为数字
  const [selectedCategory, setSelectedCategory] = useState('午餐');
  // 默认选中"午餐"
  const [note, setNote] = useState('');
  // 备注
  const [saving, setSaving] = useState(false);
  // 是否正在保存中，用于防止重复点击

  // --- 保存开支 ---
  const handleSave = async () => {
    // ---- 输入校验 ----
    const amountNum = parseFloat(amount);
    // parseFloat: 把字符串转成带小数的数字
    // 例如 '12.50' → 12.5，'abc' → NaN（Not a Number，表示不是数字）

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      // !amount: 没填
      // isNaN(x): x 是不是 NaN？
      // amountNum <= 0: 金额必须大于 0
      Alert.alert('提示', '请输入有效的金额');
      return;
      // return 提前退出，后面的代码不执行
    }

    if (amountNum > 999999.99) {
      Alert.alert('提示', '金额不能超过 999,999.99');
      return;
    }

    setSaving(true);
    // 标记保存中，按钮变灰，防止用户连点

    try {
      await addExpense({
        amount: amountNum,           // 已转为数字的金额
        category: selectedCategory,  // 用户选中的分类
        note: note.trim(),           // trim() 去掉首尾空格
        date: getTodayString(),      // 当天日期
      });

      triggerRefresh();
      // 通知首页：数据变了，重新加载

      navigation.goBack();
      // 返回上一页（首页）
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      // finally 块无论 try 成功还是 catch 失败都会执行
      setSaving(false);
      // 恢复按钮状态
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // ↑ 键盘弹起时自动把页面往上顶，防止遮住输入框
      //   iOS 需要手动设置 behavior，Android 系统默认就会处理
    >
      <ScrollView>
        {/* ScrollView: 内容超出屏幕时可以滚动 */}

        {/* ========== 金额输入 ========== */}
        <Text style={styles.label}>金额 (¥)</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          // placeholder: 输入框为空时显示的提示文字
          placeholderTextColor="#CCC"
          keyboardType="decimal-pad"
          // keyboardType: 弹出哪种键盘
          //   'decimal-pad' = 数字键盘（带小数点）
          value={amount}
          onChangeText={setAmount}
          // onChangeText: 用户每输入一个字，就调用 setAmount 更新状态
          autoFocus={true}
          // autoFocus: 进入页面自动弹出键盘
        />

        {/* ========== 分类选择 ========== */}
        <Text style={styles.label}>分类</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            // map 遍历 CATEGORIES 数组，为每个分类生成一个按钮
            <TouchableOpacity
              key={cat}
              // key: 每个列表项必须有的唯一标识（这里用分类名本身）
              style={[
                styles.categoryButton,
                selectedCategory === cat && styles.categoryButtonActive,
                // ↑ 如果当前分类被选中，叠加高亮样式
              ]}
              onPress={() => setSelectedCategory(cat)}
              // 点击某个分类，就把它设为选中
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ========== 备注输入 ========== */}
        <Text style={styles.label}>备注（选填）</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="比如：和同事聚餐..."
          placeholderTextColor="#CCC"
          value={note}
          onChangeText={setNote}
          maxLength={50}
          // maxLength: 最多输入 50 个字符（与产品文档一致）
          multiline={false}
          // 单行输入
        />

        {/* ========== 保存按钮 ========== */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          //                                ↑ 保存中时叠加灰色样式
          onPress={handleSave}
          disabled={saving}
          // disabled={true} 时按钮不可点击，防止重复提交
        >
          <Text style={styles.saveButtonText}>
            {saving ? '保存中...' : '✓ 记下这笔'}
            {/* 根据 saving 状态显示不同文字 */}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ------------------------------------------------------------------
// 样式
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 10,
    fontSize: 32,
    // 金额用大字体，视觉突出
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    // 文字居中
  },

  // --- 分类网格 ---
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // flexWrap: 一行放不下就自动换行
    paddingHorizontal: 16,
    gap: 10,
    // 按钮之间的间距
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    // 大圆角 → 胶囊形状
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryButtonActive: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
    // 选中状态：蓝色背景
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
    // 选中状态：白色粗字
  },

  // --- 备注 ---
  noteInput: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    color: '#333',
  },

  // --- 保存按钮 ---
  saveButton: {
    backgroundColor: '#4A90D9',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#A0C4E8',
    // 禁用时变浅
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
