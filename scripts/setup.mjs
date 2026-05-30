#!/usr/bin/env node
/**
 * RedMushroom 一鍵安裝腳本
 * 支援：Windows / Mac / Linux
 * 不需要任何技術知識，雙擊 start.bat 或 start.command 即可使用
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Bump this string whenever the seed scripts change in a breaking way.
// Run.bat checks for this file; if missing or stale, it wipes and re-seeds.
const DB_VERSION = 'shuffle-v1';

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

const TOTAL_STEPS = 5;
function step(n, msg) {
  log(`\n[${n}/${TOTAL_STEPS}] ${msg}`, colors.cyan + colors.bold);
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

// Detect when a native module's prebuilt .node file was compiled for a
// different Node version (typical symptom of copying node_modules across PCs)
// and auto-rebuild it. Without this, start.bat fails on first DB open with
// "NODE_MODULE_VERSION X. This version of Node.js requires NODE_MODULE_VERSION Y".
function ensureNativeOk(pkgDir, modName) {
  try {
    execSync(`node -e "require('${modName}')"`, { cwd: pkgDir, stdio: 'pipe' });
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e.message || '');
    if (!/NODE_MODULE_VERSION|ERR_DLOPEN_FAILED|was compiled against/i.test(msg)) {
      throw e;
    }
    warn(
      `偵測到 ${modName} 的原生模組與此電腦的 Node ${process.versions.node} 不相容` +
      `（通常是從另一台電腦複製 node_modules 過來造成的）。正在自動重新編譯…`,
    );
    try {
      run(`npm rebuild ${modName}`, pkgDir);
    } catch {
      warn('npm rebuild 失敗，改用完整重新安裝…');
      run(`npm install --force ${modName}`, pkgDir);
    }
    // Re-probe — if it still fails, surface the original error to the user.
    execSync(`node -e "require('${modName}')"`, { cwd: pkgDir, stdio: 'pipe' });
    success(`${modName} 已重新編譯並可用。`);
  }
}

// ────────────────────────────────────────
// 步驟 1：檢查 Node.js 版本
// ────────────────────────────────────────
step(1, '檢查 Node.js 版本...');
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
step(2, '安裝所有依賴套件（可能需要 1-3 分鐘，請耐心等候）...');

log('  → 安裝根目錄依賴...', colors.yellow);
run('npm install --prefer-offline 2>/dev/null || npm install', ROOT);

log('  → 安裝後端依賴...', colors.yellow);
run('npm install --prefer-offline 2>/dev/null || npm install', join(ROOT, 'backend'));
ensureNativeOk(join(ROOT, 'backend'), 'better-sqlite3');

log('  → 安裝前端依賴...', colors.yellow);
run('npm install --prefer-offline 2>/dev/null || npm install', join(ROOT, 'frontend'));

log('  → 安裝腳本依賴 (seed 工具)...', colors.yellow);
run('npm install --prefer-offline 2>/dev/null || npm install', join(ROOT, 'scripts'));
ensureNativeOk(join(ROOT, 'scripts'), 'better-sqlite3');

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
step(3, '建立 SQLite 資料庫...');

const dbDir = join(ROOT, 'database');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

run('npx tsx scripts/init-db.ts', ROOT);
success('資料庫建立完成！');

// ────────────────────────────────────────
// 步驟 4：填入示範題目
// ────────────────────────────────────────
step(4, '填入示範題目、臺灣在地化題庫與讚美語庫（共 4 個種子）...');
log('  → 示範帳號與 11 條讚美語...', colors.yellow);
run('npx tsx scripts/seed-minimal.ts', ROOT);
log('  → 32-cell 題目矩陣（約 1500 題）...', colors.yellow);
run('npx tsx scripts/generate-questions.ts', ROOT);
log('  → 臺灣在地化題目（夜市/捷運/珍奶）...', colors.yellow);
run('npx tsx scripts/seed-questions-taiwan.ts', ROOT);
log('  → 數學模組（32 題覆蓋 4×8 矩陣）...', colors.yellow);
run('npx tsx scripts/seed-math.ts', ROOT);
log('  → 讚美語庫（500+ 一般 + 50 SEN）...', colors.yellow);
run('npx tsx scripts/seed-praise-library.ts', ROOT);
success('示範資料填入完成！');

// Write version marker so Run.bat knows the DB is up-to-date.
writeFileSync(join(ROOT, 'database', '.db-version'), DB_VERSION);

// ────────────────────────────────────────
// 步驟 5：完成！
// ────────────────────────────────────────
step(5, '安裝完成！');
log('\n' + '='.repeat(50), colors.green + colors.bold);
log('🍄 RedMushroom 安裝成功！', colors.green + colors.bold);
log('='.repeat(50), colors.green + colors.bold);
log('\n現在請執行：npm start', colors.cyan);
log('瀏覽器會自動開啟 http://localhost:5173\n', colors.cyan);
