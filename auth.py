from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from db import get_db_connection

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

@auth_bp.route('/register', methods=['POST'])
def register():
    # 接收 JSON 格式資料
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': '無效的請求資料！'}), 400
        
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': '帳號與密碼為必填欄位！'}), 400
        
    conn = get_db_connection()
    try:
        # 檢查帳號是否已存在
        existing_user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        if existing_user:
            return jsonify({'success': False, 'message': '此帳號已被註冊！'}), 400
            
        # 密碼加密
        hashed_password = generate_password_hash(password)
        
        # 寫入資料庫
        conn.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, hashed_password))
        conn.commit()
        
        return jsonify({'success': True, 'message': '註冊成功！'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'註冊失敗，系統錯誤: {str(e)}'}), 500
    finally:
        conn.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    # 接收 JSON 格式資料
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': '無效的請求資料！'}), 400
        
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': '帳號與密碼為必填欄位！'}), 400
        
    conn = get_db_connection()
    try:
        # 尋找使用者
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'message': '帳號或密碼錯誤！'}), 401
            
        # 登入成功，將資訊寫入 session
        session['user_id'] = user['id']
        session['username'] = user['username']
        
        return jsonify({'success': True, 'message': '登入成功！'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'登入失敗，系統錯誤: {str(e)}'}), 500
    finally:
        conn.close()

@auth_bp.route('/logout', methods=['POST'])
def logout():
    # 清除 session 資訊
    session.clear()
    return jsonify({'success': True, 'message': '已成功登出！'})

@auth_bp.route('/diet/update', methods=['POST'])
def update_diet():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': '尚未登入，請先登入！'}), 401
        
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': '無效的請求資料！'}), 400
        
    protein_diff = data.get('protein', 0)
    carb_diff = data.get('carb', 0)
    veg_diff = data.get('veg', 0)
    
    import datetime
    today = datetime.date.today().isoformat()
    
    conn = get_db_connection()
    try:
        record = conn.execute(
            'SELECT * FROM diet_records WHERE user_id = ? AND record_date = ?',
            (user_id, today)
        ).fetchone()
        
        if record:
            new_protein = max(0, record['protein_slots'] + protein_diff)
            new_carb = max(0, record['carb_slots'] + carb_diff)
            new_veg = max(0, record['veg_slots'] + veg_diff)
            
            conn.execute(
                'UPDATE diet_records SET protein_slots = ?, carb_slots = ?, veg_slots = ? WHERE id = ?',
                (new_protein, new_carb, new_veg, record['id'])
            )
            message = '飲食紀錄更新成功！'
        else:
            init_protein = max(0, protein_diff)
            init_carb = max(0, carb_diff)
            init_veg = max(0, veg_diff)
            
            conn.execute(
                'INSERT INTO diet_records (user_id, record_date, protein_slots, carb_slots, veg_slots) VALUES (?, ?, ?, ?, ?)',
                (user_id, today, init_protein, init_carb, init_veg)
            )
            message = '今日飲食紀錄新增成功！'
            
        conn.commit()
        return jsonify({'success': True, 'message': message})
    except Exception as e:
        return jsonify({'success': False, 'message': f'更新飲食紀錄失敗，系統錯誤: {str(e)}'}), 500
    finally:
        conn.close()

