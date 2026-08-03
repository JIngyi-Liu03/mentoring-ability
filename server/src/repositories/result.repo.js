// ============================================================
// server/src/repositories/result.repo.js —— 测评结果数据访问层
//
// 职责：results 表的增查与统计聚合，仅负责存取数据
// ============================================================

import db from '../db.js'

// 保存一次测评
export function insert({ userId, overall, overallLevel, dimensionScores, answers }) {
  return db.prepare(
    `INSERT INTO results (user_id, overall, overall_level, dimension_scores, answers, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).run(
    userId,
    overall,
    overallLevel,
    JSON.stringify(dimensionScores),
    JSON.stringify(answers)
  )
}

// 某用户的历史测评（不含详情）
export function listByUser(userId) {
  return db.prepare(
    'SELECT id, overall, overall_level, created_at FROM results WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId)
}

// 某次测评详情（仅本人）
export function findByIdAndUser(id, userId) {
  return db.prepare('SELECT * FROM results WHERE id = ? AND user_id = ?').get(id, userId)
}

// ===== 管理统计（adminId 传 null 时不排除管理员） =====

export function countExcluding(adminId) {
  return adminId
    ? db.prepare('SELECT COUNT(*) c FROM results WHERE user_id != ?').get(adminId).c
    : db.prepare('SELECT COUNT(*) c FROM results').get().c
}

export function avgOverallExcluding(adminId) {
  const row = adminId
    ? db.prepare('SELECT AVG(overall) a FROM results WHERE user_id != ?').get(adminId)
    : db.prepare('SELECT AVG(overall) a FROM results').get()
  return row.a ?? 0
}

export function allDimensionScoresExcluding(adminId) {
  return adminId
    ? db.prepare('SELECT dimension_scores FROM results WHERE user_id != ?').all(adminId)
    : db.prepare('SELECT dimension_scores FROM results').all()
}

export function levelDistExcluding(adminId) {
  return adminId
    ? db.prepare('SELECT overall_level l, COUNT(*) c FROM results WHERE user_id != ? GROUP BY overall_level ORDER BY l').all(adminId)
    : db.prepare('SELECT overall_level l, COUNT(*) c FROM results GROUP BY overall_level ORDER BY l').all()
}

// 全部测评记录（含用户名，排除管理员，限量 500）
export function listWithUserExcluding(adminName) {
  return db.prepare(`
    SELECT r.id, r.user_id, u.username, u.name, r.overall, r.overall_level, r.created_at
    FROM results r JOIN users u ON u.id = r.user_id
    WHERE u.role != 'admin' AND u.username != ?
    ORDER BY r.created_at DESC
    LIMIT 500
  `).all(adminName)
}
