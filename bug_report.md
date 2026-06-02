# 營養均衡小幫手 — Bug 修正報告

**專題名稱：** 營養均衡小幫手  
**組別：** 第 17 組  
**報告日期：** 6/4（階段二 — 功能整合、測試、Bug 修正）  
**對應里程碑：** 5/21 完成 F-01、F-02 後的 Bug 審查與修正

---

## 一、Bug 總覽

| # | Bug 名稱 | 嚴重程度 | 所在檔案 | 狀態 |
|---|---------|---------|---------|------|
| B-01 | 註冊缺少密碼長度驗證 | 🔴 高 | `app.py`、`login.html` | 待修正 |
| B-02 | 註冊缺少帳號空白/特殊字元驗證 | 🔴 高 | `app.py` | 待修正 |
| B-03 | API 紀錄未驗證輸入型別與範圍 | 🔴 高 | `app.py` | 待修正 |
| B-04 | 資料庫連線未使用 try-finally 保護 | 🟡 中 | `app.py` | 待修正 |
| B-05 | `init_db()` 讀取 schema.sql 未指定編碼 | 🟡 中 | `db.py` | 待修正 |
| B-06 | 重複送出紀錄（按鈕連點） | 🟡 中 | `main.js` | 待修正 |
| B-07 | `navbar-dark` 與淺色背景衝突致漢堡選單不可見 | 🟡 中 | `base.html` | 待修正 |
| B-08 | 歷史紀錄 XSS 注入風險 | 🔴 高 | `history.html` | 待修正 |
| B-09 | CSS `--primary-color` 變數未在動畫中生效 | 🟢 低 | `main.js`、`style.css` | 待修正 |
| B-10 | 登出按鈕 `text-warning` 在淺色 navbar 上難以辨識 | 🟢 低 | `base.html` | 待修正 |
| B-11 | `schema.sql` 含有 DROP TABLE — 生產環境風險 | 🟡 中 | `schema.sql` | 待修正 |
| B-12 | Secret Key 寫死在程式碼中 | 🟡 中 | `app.py` | 待修正 |

---

## 二、Bug 詳細說明與修正方式

---

### B-01：註冊缺少密碼長度驗證

**檔案：** `app.py` 第 38-56 行、`login.html` 第 26 行  
**嚴重程度：** 🔴 高  
**問題描述：**  
使用者在註冊時可以輸入任意長度的密碼（包含空密碼），只靠 HTML `required` 屬性擋住空值，但後端未驗證密碼長度。攻擊者可用 API 工具送出空密碼或 1 字密碼。

**修正方式：**
```diff
 # app.py — register()
 @app.route('/register', methods=['GET', 'POST'])
 def register():
     if request.method == 'POST':
         username = request.form['username']
         password = request.form['password']
+
+        if len(password) < 6:
+            return render_template('login.html', error='密碼至少需要 6 個字元', is_register=True)
```
```diff
 <!-- login.html -->
- <input type="password" class="form-control rounded-3" id="password" name="password" placeholder="密碼" required>
+ <input type="password" class="form-control rounded-3" id="password" name="password" placeholder="密碼" required minlength="6">
```

---

### B-02：註冊缺少帳號空白/特殊字元驗證

**檔案：** `app.py` 第 40-42 行  
**嚴重程度：** 🔴 高  
**問題描述：**  
使用者可以用純空白或包含特殊字元的帳號名稱註冊，後端未做 `strip()` 或格式檢查。

**修正方式：**
```diff
 @app.route('/register', methods=['GET', 'POST'])
 def register():
     if request.method == 'POST':
-        username = request.form['username']
-        password = request.form['password']
+        username = request.form['username'].strip()
+        password = request.form['password']
+
+        if not username or len(username) < 2:
+            return render_template('login.html', error='帳號至少需要 2 個字元', is_register=True)
```

---

### B-03：API 紀錄未驗證輸入型別與範圍

**檔案：** `app.py` 第 69-90 行  
**嚴重程度：** 🔴 高  
**問題描述：**  
`POST /api/record` 端點直接信任前端傳入的值，未驗證：
1. `protein`、`carb`、`veg` 是否為整數
2. 數值是否為負數
3. `food_name` 是否過長
4. `request.json` 是否為 `None`（Content-Type 不正確時）

**修正方式：**
```diff
 @app.route('/api/record', methods=['POST'])
 def add_record():
     if 'user_id' not in session:
         return jsonify({'status': 'error', 'message': '未登入'}), 401

     data = request.json
+    if data is None:
+        return jsonify({'status': 'error', 'message': '無效的請求格式'}), 400
+
     protein = data.get('protein', 0)
     carb = data.get('carb', 0)
     veg = data.get('veg', 0)
     food_name = data.get('food_name', '')
+
+    # 型別與範圍驗證
+    try:
+        protein = int(protein)
+        carb = int(carb)
+        veg = int(veg)
+    except (ValueError, TypeError):
+        return jsonify({'status': 'error', 'message': '份數必須為整數'}), 400
+
+    if protein < 0 or carb < 0 or veg < 0:
+        return jsonify({'status': 'error', 'message': '份數不能為負數'}), 400
+
+    if len(food_name) > 50:
+        return jsonify({'status': 'error', 'message': '食物名稱過長'}), 400
```

---

### B-04：資料庫連線未使用 try-finally 保護

**檔案：** `app.py` 多處（第 25-27、44-53、82-88、99-108、126-146 行）  
**嚴重程度：** 🟡 中  
**問題描述：**  
所有資料庫操作中，若 `conn.execute()` 拋出例外，`conn.close()` 將不會被執行，導致資料庫連線洩漏。

**修正方式（以 `add_record` 為例）：**
```diff
-    conn = get_db_connection()
-    conn.execute('''
-        INSERT INTO records (...)
-        VALUES (?, ?, ?, ?, ?, ?)
-    ''', (...))
-    conn.commit()
-    conn.close()
+    conn = get_db_connection()
+    try:
+        conn.execute('''
+            INSERT INTO records (...)
+            VALUES (?, ?, ?, ?, ?, ?)
+        ''', (...))
+        conn.commit()
+    finally:
+        conn.close()
```
> 建議所有 `get_db_connection()` 呼叫後都加上 `try-finally`。

---

### B-05：`init_db()` 讀取 schema.sql 未指定編碼

**檔案：** `db.py` 第 14 行  
**嚴重程度：** 🟡 中  
**問題描述：**  
`open('schema.sql')` 未指定 `encoding='utf-8'`。在 Windows 系統上，Python 的預設編碼可能是 `cp950` 或 `gbk`，若 `schema.sql` 包含中文註解或未來擴展有中文欄位，將導致 `UnicodeDecodeError`。

**修正方式：**
```diff
 def init_db():
     if not os.path.exists(DATABASE):
         connection = get_db_connection()
-        with open('schema.sql') as f:
+        with open('schema.sql', encoding='utf-8') as f:
             connection.executescript(f.read())
         connection.commit()
         connection.close()
```

---

### B-06：重複送出紀錄（按鈕連點）

**檔案：** `static/js/main.js` 第 29-49 行、第 47-49 行  
**嚴重程度：** 🟡 中  
**問題描述：**  
使用者快速連續點擊「送出紀錄」按鈕或原型食物快捷按鈕時，由於 `sendRecord()` 是非同步函數，在回應返回前可以再次觸發，造成重複寫入資料庫。

**修正方式：**
```diff
+let isSending = false;
+
 async function sendRecord(data) {
+    if (isSending) return;
+    isSending = true;
     try {
         const response = await fetch('/api/record', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(data)
         });
         const result = await response.json();
         if (result.status === 'success') {
             showToast();
             fetchTodayStats();
         } else {
             alert(result.message || '紀錄失敗');
         }
     } catch (error) {
         console.error('Error saving record:', error);
         alert('系統發生錯誤，請稍後再試。');
+    } finally {
+        isSending = false;
     }
 }
```

---

### B-07：`navbar-dark` 與淺色背景衝突致漢堡選單不可見

**檔案：** `templates/base.html` 第 18 行  
**嚴重程度：** 🟡 中  
**問題描述：**  
Navbar 使用 `navbar-dark` class（白色文字/圖示），但 `.custom-navbar` CSS 設定背景為 `rgba(255, 255, 255, 0.85)`（近乎白色），同時又透過 CSS 覆蓋文字為深色。這導致 Bootstrap 的漢堡選單圖示（`navbar-toggler-icon`）使用白色 SVG 在白色背景上無法看見（手機版面）。

**修正方式：**
```diff
- <nav class="navbar navbar-expand-lg navbar-dark fixed-top custom-navbar">
+ <nav class="navbar navbar-expand-lg navbar-light fixed-top custom-navbar">
```

---

### B-08：歷史紀錄 XSS 注入風險

**檔案：** `templates/history.html` 第 66 行  
**嚴重程度：** 🔴 高  
**問題描述：**  
`food_name` 直接使用字串模板插入 `innerHTML` 而未經過跳脫處理。若攻擊者透過 API 直接寫入包含 `<script>` 標籤的 `food_name`，可造成 XSS（跨站腳本攻擊）。

**修正方式：**
```diff
+function escapeHtml(text) {
+    const div = document.createElement('div');
+    div.textContent = text;
+    return div.innerHTML;
+}
+
 data.raw_records.forEach(record => {
     const row = document.createElement('tr');
     let contentLabel = '';
     if (record.food_name) {
-        contentLabel = `<span class="badge ...">${record.food_name}</span>`;
+        contentLabel = `<span class="badge ...">${escapeHtml(record.food_name)}</span>`;
     } else {
         contentLabel = `<span class="text-muted">手動紀錄</span>`;
     }
```

---

### B-09：CSS 變數在動畫中未正確生效

**檔案：** `static/js/main.js` 第 21 行  
**嚴重程度：** 🟢 低  
**問題描述：**  
`updateQty()` 中使用 `el.style.color = 'var(--primary-color)'`，但 `<span>` 元素位於 Bootstrap 的 `.bg-light` 容器內，CSS 變數 `--primary-color` 在此定義域內可能未正確繼承到行內樣式中。不會造成錯誤但顏色高亮效果可能失效。

**修正方式：**
```diff
 // main.js — updateQty()
-        el.style.color = 'var(--primary-color)';
+        el.style.color = '#4361ee';
```

---

### B-10：登出按鈕在淺色 Navbar 上難以辨識

**檔案：** `templates/base.html` 第 37 行  
**嚴重程度：** 🟢 低  
**問題描述：**  
登出連結使用 `text-warning`（黃色），在白色半透明 navbar 背景上對比度不足，不符合 WCAG 無障礙標準。

**修正方式：**
```diff
- <a class="nav-link text-warning" href="{{ url_for('logout') }}">登出</a>
+ <a class="nav-link text-danger" href="{{ url_for('logout') }}">登出</a>
```

---

### B-11：`schema.sql` 含有 DROP TABLE — 生產環境風險

**檔案：** `schema.sql` 第 1-2 行  
**嚴重程度：** 🟡 中  
**問題描述：**  
`schema.sql` 以 `DROP TABLE IF EXISTS` 開頭。雖然 `init_db()` 只在資料庫檔案不存在時執行，但若未來有人手動呼叫 `executescript()`，可能造成資料遺失。

**修正方式：**
```diff
- DROP TABLE IF EXISTS users;
- DROP TABLE IF EXISTS records;
-
- CREATE TABLE users (
+ CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ...
  );

- CREATE TABLE records (
+ CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ...
  );
```

---

### B-12：Secret Key 寫死在程式碼中

**檔案：** `app.py` 第 8 行  
**嚴重程度：** 🟡 中  
**問題描述：**  
`app.secret_key = 'super_secret_key_for_nutrition_app'` 直接寫在原始碼中，任何有原始碼存取權限的人都可偽造 Session。

**修正方式：**
```diff
- app.secret_key = 'super_secret_key_for_nutrition_app'
+ app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key_change_in_production')
```

---

## 三、修正優先順序建議

### 🔴 立即修正（高優先）
1. **B-03** API 輸入驗證 — 防止惡意資料寫入
2. **B-08** XSS 注入修正 — 安全漏洞
3. **B-01** 密碼長度驗證 — 帳號安全
4. **B-02** 帳號格式驗證 — 資料完整性

### 🟡 下一版修正（中優先）
5. **B-06** 防止重複送出 — 使用者體驗
6. **B-04** 資料庫連線保護 — 系統穩定性
7. **B-07** Navbar 漢堡選單修正 — 手機版可用性
8. **B-05** 檔案編碼指定 — Windows 相容性
9. **B-11** Schema DROP TABLE 修正 — 資料安全
10. **B-12** Secret Key 環境變數化 — 部署安全

### 🟢 非關鍵（低優先）
11. **B-09** CSS 變數動畫修正 — 視覺微調
12. **B-10** 登出按鈕對比度 — 無障礙體驗

---

## 四、測試建議

| 測試項目 | 測試方式 | 預期結果 |
|---------|---------|---------|
| 密碼長度限制 | 嘗試以 1~5 字密碼註冊 | 顯示錯誤提示「密碼至少需要 6 個字元」 |
| 空白帳號 | 以純空格帳號名稱嘗試註冊 | 顯示錯誤提示 |
| 負數份數 | 用 Postman 送出 `{"protein": -5}` | 回傳 400 錯誤 |
| 連續點擊送出 | 快速連點「送出紀錄」5 次 | 只產生 1 筆紀錄 |
| XSS 測試 | 透過 API 寫入 `food_name: "<script>alert(1)</script>"` | 歷史紀錄顯示純文字，不觸發腳本 |
| 手機版漢堡選單 | 縮小瀏覽器寬度至 < 992px | 漢堡選單圖示清晰可見且可點擊 |

---

**組員：** 李宜蓁、邱瀞賢、劉雁綾、蘇郁晴、朱晉儀、詹為媺  
**SDLC 階段：** 階段二 — 測試與 Bug 修正
