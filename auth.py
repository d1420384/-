import sqlite3
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api')
DATABASE = 'nutrition_helper.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@auth_bp.route('/register', methods=['POST'])
def api_register():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"success": False, "message": "請提供帳號與密碼！"}), 400
    
    username = data['username']
    password = data['password']
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    
    if user:
        conn.close()
        return jsonify({"success": False, "message": "此帳號已被註冊！"}), 400
        
    conn.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)',
                 (username, generate_password_hash(password)))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "註冊成功！"}), 200

@auth_bp.route('/login', methods=['POST'])
def api_login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"success": False, "message": "請提供帳號與密碼！"}), 400
        
    username = data['username']
    password = data['password']
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({"success": True, "message": "登入成功！"}), 200
    else:
        return jsonify({"success": False, "message": "帳號或密碼錯誤！"}), 401

@auth_bp.route('/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({"success": True, "message": "已成功登出！"}), 200

@auth_bp.route('/diet/update', methods=['POST'])
def update_diet():
    user_id = session.get('user_id')
    if not user_id:
        from flask_login import current_user
        if current_user.is_authenticated:
            user_id = current_user.id
            
    if not user_id:
        return jsonify({"success": False, "message": "尚未登入,請先登入!"}), 401
        
    data = request.get_json() or {}
    protein_change = data.get('protein', 0)
    carb_change = data.get('carb', 0)
    veg_change = data.get('veg', 0)
    
    today = datetime.date.today().isoformat()
    conn = get_db_connection()
    
    record = conn.execute(
        'SELECT id, protein_slots, carb_slots, veg_slots FROM diet_records WHERE user_id = ? AND record_date = ?',
        (user_id, today)
    ).fetchone()
    
    if record:
        new_p = max(0, record['protein_slots'] + protein_change)
        new_c = max(0, record['carb_slots'] + carb_change)
        new_v = max(0, record['veg_slots'] + veg_change)
        conn.execute(
            'UPDATE diet_records SET protein_slots = ?, carb_slots = ?, veg_slots = ? WHERE id = ?',
            (new_p, new_c, new_v, record['id'])
        )
        message = "飲食紀錄更新成功！"
    else:
        p = max(0, protein_change)
        c = max(0, carb_change)
        v = max(0, veg_change)
        conn.execute(
            'INSERT INTO diet_records (user_id, record_date, protein_slots, carb_slots, veg_slots) VALUES (?, ?, ?, ?, ?)',
            (user_id, today, p, c, v)
        )
        message = "今日飲食紀錄新增成功！"
        
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": message}), 200
