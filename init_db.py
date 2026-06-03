import sqlite3
import os

DATABASE = 'nutrition_helper.db'

def init_db():
    print(f"正在初始化資料庫: {DATABASE}...")
    
    # 建立或連接資料庫
    conn = sqlite3.connect(DATABASE)
    
    try:
        # 讀取並執行 schema.sql
        with open('schema.sql', 'r', encoding='utf-8') as f:
            conn.executescript(f.read())
        conn.commit()
        print(f"資料庫 {DATABASE} 初始化成功！")
    except Exception as e:
        print(f"資料庫初始化失敗: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    init_db()
