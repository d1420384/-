# 營養均衡小幫手 — 5/21 進度報告

**專題名稱：** 營養均衡小幫手  
**組別：** 第 17 組  
**報告日期：** 5/21  
**對應階段：** 階段二 — 實作 Implementation × Testing  
**本週目標：** 核心紀錄與快捷鍵開發 — 完成 F-01 紀錄按鈕與 F-02 原型食物（雞胸肉、地瓜等）快捷功能

---

## 一、本週完成項目總覽

| 功能編號 | 功能名稱 | 完成狀態 | 負責組員 |
|---------|---------|---------|---------|
| F-01 | 飲食快速紀錄 | ✅ 已完成 | 李宜蓁 |
| F-02 | 原型食物快捷鍵 | ✅ 已完成 | 邱瀞賢 |

---

## 二、F-01 飲食快速紀錄 — 功能說明

### 2.1 功能描述
使用者可透過主控台（Dashboard）頁面上的 **「+」「-」按鈕**，快速調整蛋白質、澱粉、蔬果三大營養素的份數，並按下「送出紀錄」按鈕將資料儲存至 SQLite 資料庫。

### 2.2 實作細節

#### 前端（`templates/dashboard.html`）
- 三大營養素各有獨立的份數加減控制列：
  - 🥩 **蛋白質** — 紅色系按鈕
  - 🍚 **澱粉** — 黃色系按鈕
  - 🥦 **蔬果** — 綠色系按鈕
- 每列包含 **「-」按鈕、數量顯示、「+」按鈕**，操作直覺。
- 底部有「**送出紀錄**」按鈕（藍色圓角全寬按鈕），點擊後送出當前份數至後端 API。
- 送出成功後自動：
  - 重置份數為 0
  - 顯示 Toast 提示「✅ 紀錄成功！」
  - 即時更新營養儀表板數據

#### JavaScript 邏輯（`static/js/main.js`）
- `updateQty(type, amount)`：控制份數加減，最小值為 0，並附帶縮放動畫效果。
- `submitManualRecord()`：收集三大營養素份數，檢查至少輸入一份後呼叫 API。
- `sendRecord(data)`：以 `fetch()` 發送 POST 請求至 `/api/record`，成功後觸發 Toast 通知與圖表刷新。

#### 後端 API（`app.py`）
- **POST `/api/record`**：接收 JSON 資料（protein, carb, veg, food_name），驗證使用者登入狀態後寫入 `records` 資料表。
- **GET `/api/today`**：查詢當日該使用者的蛋白質、澱粉、蔬果累計份數，回傳 JSON 供前端儀表板即時呈現。

#### 資料庫（`schema.sql`）
```sql
CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    protein_portions INTEGER DEFAULT 0,
    carb_portions INTEGER DEFAULT 0,
    veg_portions INTEGER DEFAULT 0,
    food_name TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

---

## 三、F-02 原型食物快捷鍵 — 功能說明

### 3.1 功能描述
內建常見「原型食物」的 **一鍵紀錄功能**，使用者只需點擊一次即可將該食物對應的營養份數自動寫入紀錄，無需手動加減份數。

### 3.2 目前內建原型食物

| 食物名稱 | 圖示 | 蛋白質 (份) | 澱粉 (份) | 蔬果 (份) | 按鈕顏色 |
|---------|------|-----------|----------|---------|---------|
| 雞胸肉 | 🍗 | 2 | 0 | 0 | 藍色 (primary) |
| 地瓜 | 🍠 | 0 | 2 | 0 | 黃色 (warning) |
| 無糖豆漿 | 🥛 | 1 | 0 | 0 | 淺藍色 (info) |

### 3.3 實作細節

#### 前端（`templates/dashboard.html`）
- 快捷鍵區域以卡片形式呈現，標題為「**原型食物快捷鍵**」。
- 每個原型食物為一個獨立按鈕，採用 **3 欄網格排列**，包含：
  - 食物 emoji 圖示（大尺寸）
  - 食物名稱（粗體）
  - 營養份數說明（灰色小字）
- 按鈕使用 `btn-outline-*` 樣式，懸停時有視覺回饋。

#### JavaScript 邏輯（`static/js/main.js`）
- `addPrototypeFood(foodName, protein, carb, veg)`：接受食物名稱與三大營養素份數，直接呼叫 `sendRecord()` 送出至後端。
- 送出時會帶入 `food_name` 欄位，使歷史紀錄中能清楚顯示所記錄的食物名稱。

#### 後端 API
- 共用 F-01 的 **POST `/api/record`** API，差異在於 `food_name` 欄位會填入原型食物名稱（如「雞胸肉」「地瓜」「無糖豆漿」）。

---

## 四、其他已完成的輔助功能

### 4.1 今日營養儀表板（部分 F-03）
- 使用 **Chart.js** 繪製圓環圖（Doughnut Chart），即時顯示當日三大營養素的比例。
- 數字動畫效果（`animateValue()`）讓數據更新更生動。
- 當尚無資料時顯示灰色佔位圖。

### 4.2 歷史紀錄查看（部分 F-04）
- **GET `/api/history`**：查詢過去 7 天的飲食紀錄。
- 歷史紀錄頁面以表格呈現，包含日期、紀錄內容（原型食物名稱或「手動紀錄」）、三大營養素份數。

### 4.3 會員系統（F-05，於 5/14 完成）
- 註冊/登入功能已完整運作。
- 密碼使用 `werkzeug` 進行 hash 加密儲存。
- Session 管理確保個人資料隔離。

---

## 五、技術架構現況

```
營養均衡小幫手/
├── app.py                 # Flask 主應用（路由 + API）
├── db.py                  # 資料庫連線與初始化
├── schema.sql             # SQLite 資料表定義
├── requirements.txt       # Python 依賴套件
├── templates/
│   ├── base.html          # 基礎模板（Navbar + Bootstrap + Chart.js）
│   ├── login.html         # 登入/註冊頁面
│   ├── dashboard.html     # 主控台（F-01 + F-02 + 儀表板）
│   └── history.html       # 歷史紀錄頁面
└── static/
    ├── css/style.css      # 自訂樣式
    └── js/main.js         # 前端互動邏輯
```

| 層面 | 技術選擇 |
|------|---------|
| 前端 | HTML / CSS / JavaScript + Bootstrap 5.3 |
| 後端 | Python + Flask |
| 資料庫 | SQLite |
| 圖表 | Chart.js |
| 字型 | Google Fonts — Noto Sans TC |

---

## 六、下週工作規劃（6/4）

| 預計完成工作 | 說明 | 負責 |
|------------|------|------|
| 功能整合 | 確認 F-01 ~ F-05 所有功能串接正常 | 全組 |
| 測試 | 進行功能測試與邊界測試 | 全組 |
| Bug 修正 | 修復測試中發現的問題 | 全組 |
| UI 優化 | 調整手機版面、按鈕大小與操作體驗 | 全組 |

---

## 七、遇到的問題與解決方式

| 問題 | 解決方式 |
|------|---------|
| 紀錄份數不能為負數 | 在 `updateQty()` 中加入 `if (newQty < 0) newQty = 0` 判斷 |
| 送出空紀錄 | `submitManualRecord()` 檢查三項份數是否皆為 0，是則提示使用者 |
| 圓環圖無資料時顯示異常 | 無資料時改顯示灰色佔位圖，標示「尚未紀錄」 |

---

**組員：** 李宜蓁、邱瀞賢、劉雁綾、蘇郁晴、朱晉儀、詹為媺  
**指導模式：** SDLC 階段二 — 實作 Implementation
