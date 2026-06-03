import sys
import os
import uuid
import datetime

# 將 workspace 目錄加入 sys.path
workspace_dir = r'c:\Users\USER\Desktop\-'
sys.path.insert(0, workspace_dir)

try:
    from app import app
    from db import get_db_connection
    print("成功載入 Flask app。")
except Exception as e:
    print("載入 app 或 db 失敗:", e)
    sys.exit(1)

client = app.test_client()

# 隨機產生測試用的使用者名稱
test_username = f"test_user_{uuid.uuid4().hex[:8]}"
test_password = "test_password123"
print(f"本次測試使用者名稱: {test_username}")

def get_today_record(username):
    conn = get_db_connection()
    today = datetime.date.today().isoformat()
    record = conn.execute(
        '''
        SELECT dr.* FROM diet_records dr 
        JOIN users u ON dr.user_id = u.id 
        WHERE u.username = ? AND dr.record_date = ?
        ''',
        (username, today)
    ).fetchone()
    conn.close()
    if record:
        return {
            'protein_slots': record['protein_slots'],
            'carb_slots': record['carb_slots'],
            'veg_slots': record['veg_slots']
        }
    return None

print("\n=== 1. 未登入測試 ===")
# 呼叫 /api/diet/update 應回傳 401
res_unauthorized = client.post('/api/diet/update', json={
    'protein': 1,
    'carb': 1,
    'veg': 1
})
print("未登入呼叫 API 結果:", res_unauthorized.status_code, res_unauthorized.get_json())
assert res_unauthorized.status_code == 401
assert res_unauthorized.get_json()['success'] is False

print("\n=== 2. 註冊與登入測試 ===")
# 註冊新帳號
res_register = client.post('/api/register', json={
    'username': test_username,
    'password': test_password
})
print("註冊結果:", res_register.status_code, res_register.get_json())
assert res_register.status_code == 200

# 登入帳號以建立 session
res_login = client.post('/api/login', json={
    'username': test_username,
    'password': test_password
})
print("登入結果:", res_login.status_code, res_login.get_json())
assert res_login.status_code == 200

print("\n=== 3. 首次更新（無紀錄新增）測試 ===")
# 驗證資料庫中目前沒有今日紀錄
initial_record = get_today_record(test_username)
print("初始今日紀錄:", initial_record)
assert initial_record is None

# 呼叫 API 新增今日紀錄，增加 protein 2, carb 1, veg 3
res_first_update = client.post('/api/diet/update', json={
    'protein': 2,
    'carb': 1,
    'veg': 3
})
print("首次更新結果:", res_first_update.status_code, res_first_update.get_json())
assert res_first_update.status_code == 200
assert res_first_update.get_json()['success'] is True

# 檢查資料庫紀錄
record_after_first = get_today_record(test_username)
print("首次更新後資料庫紀錄:", record_after_first)
assert record_after_first == {
    'protein_slots': 2,
    'carb_slots': 1,
    'veg_slots': 3
}

print("\n=== 4. 再次更新（有紀錄更新）測試 ===")
# 呼叫 API 更新今日紀錄，增加 protein 1, 減少 carb 1, veg 不變
res_second_update = client.post('/api/diet/update', json={
    'protein': 1,
    'carb': -1,
    'veg': 0
})
print("再次更新結果:", res_second_update.status_code, res_second_update.get_json())
assert res_second_update.status_code == 200
assert res_second_update.get_json()['success'] is True

# 檢查資料庫紀錄
record_after_second = get_today_record(test_username)
print("再次更新後資料庫紀錄:", record_after_second)
assert record_after_second == {
    'protein_slots': 3,
    'carb_slots': 0,
    'veg_slots': 3
}

print("\n=== 5. 不小於 0 限制保護測試 ===")
# 呼叫 API，將數值減去超過現有值的值，測試是否會被限制在 0
res_min_limit = client.post('/api/diet/update', json={
    'protein': -5,  # 3 - 5 = -2 -> 0
    'carb': -2,     # 0 - 2 = -2 -> 0
    'veg': -1       # 3 - 1 = 2 -> 2
})
print("限制保護更新結果:", res_min_limit.status_code, res_min_limit.get_json())
assert res_min_limit.status_code == 200
assert res_min_limit.get_json()['success'] is True

# 檢查資料庫紀錄
record_after_limit = get_today_record(test_username)
print("限制保護後資料庫紀錄:", record_after_limit)
assert record_after_limit == {
    'protein_slots': 0,
    'carb_slots': 0,
    'veg_slots': 2
}

print("\n=== 6. 無今日紀錄且傳入負數測試 ===")
# 我們創建另一個新使用者來測試「沒有今日紀錄，但傳入負值」的初始化狀態
new_username = f"test_user_{uuid.uuid4().hex[:8]}"
client.post('/api/register', json={'username': new_username, 'password': test_password})
client.post('/api/login', json={'username': new_username, 'password': test_password})

# 傳入負值
res_neg_init = client.post('/api/diet/update', json={
    'protein': -3,
    'carb': 5,
    'veg': -1
})
print("無紀錄傳入負值結果:", res_neg_init.status_code, res_neg_init.get_json())
assert res_neg_init.status_code == 200

# 檢查資料庫紀錄，負數應被限制在 0
record_neg_init = get_today_record(new_username)
print("無紀錄傳入負值後資料庫紀錄:", record_neg_init)
assert record_neg_init == {
    'protein_slots': 0,
    'carb_slots': 5,
    'veg_slots': 0
}

print("\n所有自動化測試順利通過！")
