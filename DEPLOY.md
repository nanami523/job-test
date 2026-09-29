# 倒數計畫加入 job-test-date（Render + Neon）

把這些檔案放進 repo 根目錄（與你原本的 index.html、exams/ 同一層）：
  index.html      （覆蓋舊的：多了一張「考試倒數計畫」卡片，連到 countdown.html）
  countdown.html  （新增）
  server.js、package.json、.gitignore（新增）
  exams/ 資料夾不用動。

Render：New → Web Service → 選 nanami523/job-test-date
  Build Command: npm install
  Start Command: npm start
  Environment Variables:
    DATABASE_URL = Neon 的連線字串（neon.tech 建免費專案後複製）
    PIN = 自訂密碼

之後用 Render 網址開葵花寶典，倒數頁會同步；
若同時用 GitHub Pages 開，倒數頁只會存在該瀏覽器，不會同步。
