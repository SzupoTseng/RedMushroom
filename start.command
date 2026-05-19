#!/bin/bash
# RedMushroom（紅蘑菇）Mac/Linux 啟動腳本
# 雙擊此檔案即可啟動

cd "$(dirname "$0")"

echo ""
echo "  ============================================="
echo "   🍄 RedMushroom（紅蘑菇）中文學習系統"
echo "  ============================================="
echo ""

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ 找不到 Node.js！"
    echo ""
    echo "  請先安裝 Node.js："
    echo "  https://nodejs.org/zh-tw"
    echo ""
    open "https://nodejs.org/zh-tw" 2>/dev/null || xdg-open "https://nodejs.org/zh-tw" 2>/dev/null
    read -p "  按 Enter 關閉..."
    exit 1
fi

echo "  ✅ Node.js $(node --version) 已安裝"
echo ""
echo "  正在安裝並啟動 RedMushroom..."
echo "  （首次執行可能需要 2-5 分鐘，請耐心等候）"
echo ""

node scripts/setup.mjs
if [ $? -ne 0 ]; then
    echo ""
    echo "  ❌ 安裝過程發生錯誤，請截圖以上訊息並回報。"
    read -p "  按 Enter 關閉..."
    exit 1
fi

echo ""
echo "  正在啟動服務..."
npm start &
NPM_PID=$!

# 等待後端啟動
sleep 5

# 開啟瀏覽器
open "http://localhost:5173" 2>/dev/null || xdg-open "http://localhost:5173" 2>/dev/null

echo ""
echo "  🍄 RedMushroom 已啟動！"
echo "  請在瀏覽器中使用，關閉此視窗會停止服務。"
echo ""
wait $NPM_PID
