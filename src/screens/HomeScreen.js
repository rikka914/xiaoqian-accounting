// ============================================================
// HomeScreen.js — 首页（应用最主要页面）
// 职责：
//   1. 显示当日可用额度、已花金额、剩余金额
//   2. 列出当天所有开支记录
//   3. 提供"添加开支"和"设置"的入口
// ============================================================

import React, { useState, useEffect, useContext, useCallback } from 'react';
//      ↑ 核心
import {
  View,              // 布局容器，类似一个看不见的盒子
  Text,              // 显示文字
  FlatList,          // 高性能滚动列表（只渲染屏幕上看得见的部分）
  TouchableOpacity,  // 可点击的容器（按下时有透明度反馈）
  StyleSheet,        // 样式定义工具
  Alert,             // 弹出系统对话框
} from 'react-native';

import { AppContext } from '../../App';
// 导入全局共享数据，拿到 settings、triggerRefresh 等

import {
  getSettings,
  getExpensesByDate,
  getDailyTotal,
  deleteExpense,
} from '../database/database';

// ------------------------------------------------------------------
// 辅助函数：获取今天的日期字符串
// 格式: 'YYYY-MM-DD'，例如 '2026-06-25'
// ------------------------------------------------------------------
function getTodayString() {
  const now = new Date();
  // Date 是 JS 内置日期对象，new Date() 创建当前时间
  const year = now.getFullYear();
  // getMonth() 返回 0-11（0 = 一月），所以需要 +1
  const month = String(now.getMonth() + 1).padStart(2, '0');
  //                   ↑ String() 转成字符串
  //                          ↑ padStart(2, '0')：不足两位前面补 0，6 变成 '06'
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
  //     ↑ 模板字符串，${} 里放变量
}

// ------------------------------------------------------------------
// 辅助函数：获取当月字符串
// 格式: 'YYYY-MM'，例如 '2026-06'
// ------------------------------------------------------------------
function getCurrentMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ------------------------------------------------------------------
// 辅助函数：计算当月剩余天数
// ------------------------------------------------------------------
function getRemainingDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // 技巧：下个月的第 0 天 = 本月最后一天
  const lastDay = new Date(year, month + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
  // 例：6 月 25 日，6 月有 30 天 → 30 - 25 + 1 = 剩余 6 天（含今天）
}

// ------------------------------------------------------------------
// 计算每日可用额度
// 参数: settings（用户设置对象）
// 返回: 数字
// 逻辑与产品文档 5.1 节一致
// ------------------------------------------------------------------
function calculateDailyBudget(settings) {
  const remainingDays = getRemainingDays();
  if (remainingDays <= 0) return 0;
  // 防止除以 0（月初最后一天可能出现）

  if (settings.monthlyIncome > 0) {
    // 有收入用户：每日额度 = (月收入 - 储蓄目标) / 剩余天数
    return (settings.monthlyIncome - settings.savingGoal) / remainingDays;
  } else {
    // 无收入用户：每日额度 = (当前存款 - 储蓄目标) / 剩余天数
    return (settings.currentBalance - settings.savingGoal) / remainingDays;
  }
}

// ------------------------------------------------------------------
// 分类对应的 emoji 图标
// 让开支列表更直观，纯文字就能实现，不需要装图标库
// ------------------------------------------------------------------
const CATEGORY_EMOJI = {
  '早餐': '🌅',
  '午餐': '☀️',
  '晚餐': '🌙',
  '奶茶': '🧋',
  '交通': '🚇',
  '购物': '🛍️',
  '娱乐': '🎮',
  '其他': '📌',
};

// ------------------------------------------------------------------
// 主组件
// ------------------------------------------------------------------
export default function HomeScreen({ navigation }) {
  // navigation 对象由 Stack.Navigator 自动注入，用于跳转页面

  // --- 从全局共享数据中取出需要的东西 ---
  const { refreshKey, triggerRefresh } = useContext(AppContext);
  //      ↑ useContext(AppContext) 取出 App.js 里定义的那些共享数据

  // --- 本页面的本地状态 ---
  const [settings, setSettings] = useState(null);
  //        ↑ 用户设置（从数据库加载）
  const [expenses, setExpenses] = useState([]);
  //        ↑ 当日开支列表，初始为空数组
  const [dailyTotal, setDailyTotal] = useState(0);
  //        ↑ 当日已花总金额

  // --- 从数据库加载数据 ---
  // useCallback 包裹函数：告诉 React"这个函数内容没变，别重复创建"
  const loadData = useCallback(async () => {
    // async 表示这是一个异步函数，内部可以用 await
    try {
      const today = getTodayString();

      // Promise.all：同时发起多个查询，等全部完成后再继续
      // 三个查询互不依赖，并行执行比逐个等更快
      const [settingsData, expensesList, total] = await Promise.all([
        getSettings(),              // 查设置表
        getExpensesByDate(today),   // 查今日开支列表
        getDailyTotal(today),       // 统计今日总金额
      ]);

      // 把查询结果写入状态，触发界面刷新
      setSettings(settingsData);
      setExpenses(expensesList);
      setDailyTotal(total);
    } catch (error) {
      // 如果上面任何一步出错，跳到这里
      console.error('加载数据失败:', error);
      Alert.alert('错误', '加载数据失败，请重试');
      // Alert.alert(标题, 内容) 弹出系统原生对话框
    }
  }, []);

  // 页面每次获得焦点时重新加载数据
  useEffect(() => {
    loadData();
  }, [refreshKey]);
  // ↑ 依赖 refreshKey：当它变化时重新执行 loadData()
  //   其他页面记完帐后调用 triggerRefresh() → refreshKey +1 → 触发这里刷新

  // --- 删除开支（长按触发） ---
  const handleDelete = (item) => {
    // 先弹出确认框
    Alert.alert(
      '删除确认',
      `删除「${item.category} ¥${item.amount.toFixed(2)}」？`,
      //      ↑ toFixed(2): 保留两位小数，如 12.50
      [
        { text: '取消', style: 'cancel' },
        // style: 'cancel' 在 iOS 上显示为普通取消样式
        {
          text: '删除',
          style: 'destructive',
          // style: 'destructive' 在 iOS 上显示为红色警告样式
          onPress: async () => {
            // onPress: 用户点击"删除"后执行的函数
            await deleteExpense(item.id);  // 从数据库删除
            triggerRefresh();              // 通知首页刷新列表
          },
        },
      ]
    );
  };

  // --- 计算预算 ---
  const dailyBudget = settings ? calculateDailyBudget(settings) : 0;
  const remaining = dailyBudget - dailyTotal;
  // remaining < 0 表示超预算了，显示红色

  // --- 界面渲染 ---
  return (
    <View style={styles.container}>
      {/* ========== 顶部预算卡片 ========== */}
      <View style={styles.budgetCard}>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>今日可用</Text>
          <Text style={styles.budgetValue}>
            ¥ {dailyBudget.toFixed(2)}
            {/* toFixed(2) 格式化金额为两位小数，如 50.00 */}
          </Text>
        </View>

        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>今日已花</Text>
          <Text style={styles.budgetValue}>
            ¥ {dailyTotal.toFixed(2)}
          </Text>
        </View>

        {/* 分隔线 */}
        <View style={styles.divider} />

        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>剩余</Text>
          <Text
            style={[
              styles.budgetValue,
              remaining < 0 && styles.overBudget,
              // ↑ && 短路运算：remaining < 0 为真时，叠加红色样式
              //   remaining >= 0 时，&& 后面的不生效，保持默认颜色
            ]}
          >
            ¥ {remaining.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* ========== 操作按钮区 ========== */}
      <View style={styles.buttonRow}>
        {/* 记一笔按钮 */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddExpense')}
          //                       ↑ 点击后跳转到添加开支页面
        >
          <Text style={styles.addButtonText}>+ 记一笔</Text>
        </TouchableOpacity>

        {/* 设置按钮 */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsButtonText}>⚙️ 设置</Text>
        </TouchableOpacity>
      </View>

      {/* ========== 开支列表 ========== */}
      <Text style={styles.sectionTitle}>
        今日明细 ({expenses.length}笔)
        {/* 显示今天一共记了几笔 */}
      </Text>

      {expenses.length === 0 ? (
        /* 列表为空时显示提示 */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>今天还没记帐呢 📝</Text>
          <Text style={styles.emptySubText}>点击"+ 记一笔"开始记录</Text>
        </View>
      ) : (
        /* FlatList: 只渲染屏幕上可见的条目，数据再多也不卡 */
        <FlatList
          data={expenses}
          // ↑ 数据源：开支数组
          keyExtractor={(item) => String(item.id)}
          // ↑ 每项的唯一 key（帮助 React 识别哪条数据变了）
          //   必须转成字符串，因为 id 是数字而 key 要求字符串
          renderItem={({ item }) => (
            // renderItem: 定义每一项长什么样
            <TouchableOpacity
              style={styles.expenseItem}
              onLongPress={() => handleDelete(item)}
              // onLongPress: 长按事件（按住约半秒触发），用于删除
            >
              {/* emoji + 分类名 */}
              <Text style={styles.expenseCategory}>
                {CATEGORY_EMOJI[item.category] || '📌'} {item.category}
              </Text>

              {/* 金额，靠右显示 */}
              <Text style={styles.expenseAmount}>
                ¥ {item.amount.toFixed(2)}
              </Text>

              {/* 备注——只有在有内容时才显示 */}
              {item.note ? (
                <Text style={styles.expenseNote}>{item.note}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ==================================================================
// 样式表
// StyleSheet.create 把样式缓存起来，提升性能
// 写法和 CSS 类似，但属性名用驼峰命名（backgroundColor 而非 background-color）
// 数值不带单位，默认是"逻辑像素"（不同分辨率手机上视觉大小一致）
// ==================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // flex: 1 表示占满全部可用空间
    backgroundColor: '#F5F6FA',
    // 页面背景：浅灰
  },

  // --- 预算卡片 ---
  budgetCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    // margin: 外边距
    padding: 20,
    // padding: 内边距
    borderRadius: 12,
    // borderRadius: 圆角
    // 以下四行 + elevation 是阴影效果（iOS 和 Android 分开写）
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    // elevation: Android 专属阴影属性，值越大阴影越深
  },
  budgetRow: {
    flexDirection: 'row',
    // 水平排列（默认是 column 垂直排列）
    justifyContent: 'space-between',
    // 两端对齐：左边 label，右边 value
    alignItems: 'center',
    paddingVertical: 6,
  },
  budgetLabel: {
    fontSize: 16,
    color: '#666',
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  overBudget: {
    color: '#E74C3C',
    // 超预算时文字变红
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 8,
  },

  // --- 操作按钮 ---
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    // gap: 子元素之间的间距
  },
  addButton: {
    flex: 2,
    // 占 2/3 宽度（配合下面 settingsButton 的 flex: 1，总份数 3）
    backgroundColor: '#4A90D9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    // 子元素水平居中
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsButton: {
    flex: 1,
    // 占 1/3 宽度
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A90D9',
  },
  settingsButtonText: {
    color: '#4A90D9',
    fontSize: 16,
  },

  // --- 列表 ---
  sectionTitle: {
    fontSize: 14,
    color: '#999',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // 内容垂直居中
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
  emptySubText: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
  },
  expenseItem: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseCategory: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    // flex: 1 占满剩余空间，把金额挤到最右边
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  expenseNote: {
    fontSize: 12,
    color: '#999',
    marginLeft: 12,
  },
});
