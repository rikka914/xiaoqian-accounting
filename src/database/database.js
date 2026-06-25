// ============================================================
// database.js — 数据持久化层
// 职责：
//   1. 创建数据表
//   2. 提供增删改查函数
//   3. 提供统计查询（当日汇总等）
//
// SQLite 是一个文件数据库，数据存在手机本地，不需要安装服务端
// ============================================================

import * as SQLite from 'expo-sqlite';

// ------------------------------------------------------------------
// 全局数据库连接 + 初始化状态追踪
// ------------------------------------------------------------------
let db = null;
let initPromise = null;   // 保存正在进行的初始化操作
let isReady = false;      // 数据库是否已就绪

// ------------------------------------------------------------------
// 初始化：打开数据库 + 建表
// 应用启动时调用一次（在 App.js 的 useEffect 里）
// 多次调用是安全的——如果已在初始化中，返回同一个 Promise
// ------------------------------------------------------------------
export async function initDatabase() {
  // 已经就绪，直接返回
  if (isReady) return;

  // 正在初始化中，等它完成
  if (initPromise) return initPromise;

  // 开始初始化
  initPromise = (async () => {
    db = await SQLite.openDatabaseAsync('xiaoqian.db');

    // --- 建表：用户设置表 ---
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        id    INTEGER PRIMARY KEY DEFAULT 1,
        monthly_income  REAL NOT NULL DEFAULT 0,
        saving_goal     REAL NOT NULL DEFAULT 0,
        current_balance REAL NOT NULL DEFAULT 0
      );
    `);

    // --- 建表：开支记录表 ---
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        amount    REAL NOT NULL,
        category  TEXT NOT NULL DEFAULT '其他',
        note      TEXT,
        date      TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );
    `);

    // --- 初始化默认设置 ---
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (id, monthly_income, saving_goal, current_balance)
       VALUES (1, 0, 0, 0);`
    );

    isReady = true;
  })();

  return initPromise;
}

// ------------------------------------------------------------------
// 内部工具：确保数据库已就绪，否则等待初始化完成
// 所有导出函数在操作 db 之前先调用它
// ------------------------------------------------------------------
async function ensureReady() {
  if (isReady) return;
  if (!initPromise) {
    // 理论上不会走到这里（App.js 应该已经调了 initDatabase）
    await initDatabase();
  } else {
    await initPromise;
  }
}

// ==================================================================
// 以下是对外暴露的数据库操作函数
// ==================================================================

export async function getSettings() {
  await ensureReady();
  const row = await db.getFirstAsync(
    'SELECT * FROM settings WHERE id = 1;'
  );
  if (!row) return null;

  return {
    monthlyIncome: row.monthly_income,
    savingGoal: row.saving_goal,
    currentBalance: row.current_balance,
  };
}

export async function updateSettings({ monthlyIncome, savingGoal, currentBalance }) {
  await ensureReady();
  await db.runAsync(
    `UPDATE settings
     SET monthly_income = ?, saving_goal = ?, current_balance = ?
     WHERE id = 1;`,
    [monthlyIncome, savingGoal, currentBalance]
  );
}

export async function addExpense({ amount, category, note, date }) {
  await ensureReady();
  const result = await db.runAsync(
    `INSERT INTO expenses (amount, category, note, date)
     VALUES (?, ?, ?, ?);`,
    [amount, category, note || '', date]
  );
  return result.lastInsertRowId;
}

export async function getExpensesByDate(dateStr) {
  await ensureReady();
  return await db.getAllAsync(
    `SELECT * FROM expenses
     WHERE date = ?
     ORDER BY created_at DESC;`,
    [dateStr]
  );
}

export async function deleteExpense(id) {
  await ensureReady();
  await db.runAsync(
    `DELETE FROM expenses WHERE id = ?;`,
    [id]
  );
}

export async function getDailyTotal(dateStr) {
  await ensureReady();
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE date = ?;`,
    [dateStr]
  );
  return row.total;
}

export async function getMonthlyTotal(yearMonth) {
  await ensureReady();
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE date LIKE ?;`,
    [`${yearMonth}%`]
  );
  return row.total;
}
