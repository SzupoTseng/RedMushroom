#!/usr/bin/env node
/**
 * RedMushroom 一鍵安裝腳本
 * 支援：Windows / Mac / Linux
 * 不需要任何技術知識，雙擊 start.bat 或 start.command 即可使用
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function step(n, total, msg) {
  log(`\n[${n}/${total}] ${msg}`, colors.cyan + colors.bold);
}

function success(msg) {
  log(`✅ ${msg}`, colors.green);
}

function warn(msg) {
  log(`⚠️  ${msg}`, colors.yellow);
}

function error(msg) {
  log(`❌ ${msg}`, colors.red);
}

function run(cmd, cwd = ROOT) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// ────────────────────────────────────────
// 步驟 1：檢查 Node.js 版本
// ────────────────────────────────────────
step(1, 5, '檢查 Node.js 版本...');
const nodeVersion = process.versions.node;
const major = parseInt(nodeVersion.split('.')[0]);
if (major < 18) {
  error(`需要 Node.js 18 以上，目前版本是 ${nodeVersion}`);
  error('請前往 https://nodejs.org 下載最新版本，安裝後重新執行此腳本。');
  process.exit(1);
}
success(`Node.js ${nodeVersion} ✓`);

// ────────────────────────────────────────
// 步驟 2：安裝依賴
// ────────────────────────────────────────
step(2, 5, '安裝所有依賴套件（可能需要 1-3 分鐘，請耐心等候）...');

log('  → 安裝根目錄依賴...', colors.yellow);
run('npm install --prefer-offline 2>/dev/null || npm install', ROOT);

log('  → 安裝後端依賴...', colors.yellow);
run('npm install --prefer-offline 2>/dev/null || npm install', join(ROOT, 'backend'));

log('  → 安裝前端依賴...', colors.yellow);
run('npm install --prefer-offline 2>/dev/null || npm install', join(ROOT, 'frontend'));

log('  → 安裝腳本依賴 (seed 工具)...', colors.yellow);
run('npm install --prefer-offline 2>/dev/null || npm install', join(ROOT, 'scripts'));

success('所有依賴安裝完成！');

// ────────────────────────────────────────
// 步驟 2B：建立後端 .env（若不存在）
// ────────────────────────────────────────
const envPath = join(ROOT, 'backend', '.env');
const envExamplePath = join(ROOT, 'backend', '.env.example');
if (!existsSync(envPath)) {
  copyFileSync(envExamplePath, envPath);
  warn('已從 .env.example 建立 backend/.env，請修改 JWT_SECRET 為強密碼！');
} else {
  success('backend/.env 已存在');
}

// ────────────────────────────────────────
// 步驟 3：建立資料庫
// ────────────────────────────────────────
step(3, 5, '建立 SQLite 資料庫...');

const dbDir = join(ROOT, 'database');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

run('npx tsx scripts/init-db.ts', ROOT);
success('資料庫建立完成！');

// ────────────────────────────────────────
// 步驟 4：填入示範題目
// ────────────────────────────────────────
step(4, 5, '填入示範題目與讚美語庫...');
run('npx tsx scripts/seed-minimal.ts', ROOT);
run('npx tsx scripts/generate-questions.ts', ROOT);
run('npx tsx scripts/seed-questions-taiwan.ts', ROOT);
run('npx tsx scripts/seed-praise-library.ts', ROOT);
success('示範資料填入完成！');

// ────────────────────────────────────────
// 步驟 5：完成！
// ────────────────────────────────────────
step(5, 5, '安裝完成！');
log('\n' + '='.repeat(50), colors.green + colors.bold);
log('🍄 RedMushroom 安裝成功！', colors.green + colors.bold);
log('='.repeat(50), colors.green + colors.bold);
log('\n現在請執行：npm start', colors.cyan);
log('瀏覽器會自動開啟 http://localhost:5173\n', colors.cyan);
