import sqlite3
import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key' # In production, use a strong random secret key
DATABASE = 'database.db'

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if not os.path.exists(DATABASE):
        with app.app_context():
            conn = get_db_connection()
            with app.open_resource('schema.sql', mode='r') as f:
                conn.cursor().executescript(f.read())
            conn.commit()
            conn.close()
    else:
        # Migration: Add missing columns if database already exists
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            # Check users table
            cursor.execute("PRAGMA table_info(users)")
            cols = [row['name'] for row in cursor.fetchall()]
            if 'target_proteins' not in cols:
                conn.execute("ALTER TABLE users ADD COLUMN target_proteins REAL DEFAULT 3.0")
            if 'target_carbs' not in cols:
                conn.execute("ALTER TABLE users ADD COLUMN target_carbs REAL DEFAULT 2.0")
            if 'target_veggies' not in cols:
                conn.execute("ALTER TABLE users ADD COLUMN target_veggies REAL DEFAULT 5.0")
            
            # Check records table
            cursor.execute("PRAGMA table_info(records)")
            cols_r = [row['name'] for row in cursor.fetchall()]
            if 'clean_score' not in cols_r:
                conn.execute("ALTER TABLE records ADD COLUMN clean_score INTEGER DEFAULT 0")
            conn.commit()
        except Exception as e:
            print(f"Migration error: {e}")
        finally:
            conn.close()

class User(UserMixin):
    def __init__(self, id, username, target_proteins=3.0, target_carbs=2.0, target_veggies=5.0):
        self.id = id
        self.username = username
        self.target_proteins = target_proteins
        self.target_carbs = target_carbs
        self.target_veggies = target_veggies

@login_manager.user_loader
def load_user(user_id):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if user is None:
        return None
    return User(
        user['id'], 
        user['username'], 
        user['target_proteins'] if 'target_proteins' in user.keys() else 3.0,
        user['target_carbs'] if 'target_carbs' in user.keys() else 2.0,
        user['target_veggies'] if 'target_veggies' in user.keys() else 5.0
    )

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/history')
@login_required
def history():
    conn = get_db_connection()
    # Get the last 7 days of records
    records = conn.execute(
        'SELECT date, proteins, carbs, veggies, clean_score FROM records WHERE user_id = ? ORDER BY date DESC LIMIT 7',
        (current_user.id,)
    ).fetchall()
    user = conn.execute(
        'SELECT target_proteins, target_carbs, target_veggies FROM users WHERE id = ?',
        (current_user.id,)
    ).fetchone()
    conn.close()
    return render_template(
        'history.html', 
        records=records,
        target_proteins=user['target_proteins'] if user else 3.0,
        target_carbs=user['target_carbs'] if user else 2.0,
        target_veggies=user['target_veggies'] if user else 5.0
    )

@app.route('/register', methods=('GET', 'POST'))
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        
        if user:
            flash('此帳號已被註冊！', 'danger')
        elif not username or not password:
            flash('帳號與密碼為必填欄位！', 'danger')
        else:
            conn.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)',
                         (username, generate_password_hash(password)))
            conn.commit()
            flash('註冊成功，請登入！', 'success')
            conn.close()
            return redirect(url_for('login'))
        conn.close()
        
    return render_template('register.html')

@app.route('/login', methods=('GET', 'POST'))
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password_hash'], password):
            remember = True if request.form.get('remember') else False
            user_obj = User(
                user['id'], 
                user['username'],
                user['target_proteins'] if 'target_proteins' in user.keys() else 3.0,
                user['target_carbs'] if 'target_carbs' in user.keys() else 2.0,
                user['target_veggies'] if 'target_veggies' in user.keys() else 5.0
            )
            login_user(user_obj, remember=remember)
            return redirect(url_for('index'))
        else:
            flash('帳號或密碼錯誤！', 'danger')
            
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/api/today', methods=['GET'])
@login_required
def get_today_stats():
    today = datetime.date.today().isoformat()
    conn = get_db_connection()
    record = conn.execute(
        'SELECT proteins, carbs, veggies, clean_score FROM records WHERE user_id = ? AND date = ?',
        (current_user.id, today)
    ).fetchone()
    user = conn.execute(
        'SELECT target_proteins, target_carbs, target_veggies FROM users WHERE id = ?',
        (current_user.id,)
    ).fetchone()
    conn.close()
    
    tp = user['target_proteins'] if user else 3.0
    tc = user['target_carbs'] if user else 2.0
    tv = user['target_veggies'] if user else 5.0
    
    if record:
        return jsonify({
            'proteins': record['proteins'], 
            'carbs': record['carbs'], 
            'veggies': record['veggies'],
            'clean_score': record['clean_score'],
            'target_proteins': tp,
            'target_carbs': tc,
            'target_veggies': tv
        })
    else:
        return jsonify({
            'proteins': 0, 
            'carbs': 0, 
            'veggies': 0,
            'clean_score': 0,
            'target_proteins': tp,
            'target_carbs': tc,
            'target_veggies': tv
        })

# ==========================================
# 功能編號：F-01 飲食紀錄核心邏輯
# 負責組員：李宜蓁
# 說明：負責處理蛋白質、澱粉、蔬果份數加減的後端路由與 SQLite 資料庫寫入邏輯。
# ==========================================
@app.route('/api/record', methods=['POST'])
@login_required
def add_record():
    data = request.get_json()
    is_batch = data.get('is_batch', False)
    
    today = datetime.date.today().isoformat()
    conn = get_db_connection()
    
    # 查詢該使用者今日是否已有飲食紀錄
    record = conn.execute(
        'SELECT id, proteins, carbs, veggies, clean_score FROM records WHERE user_id = ? AND date = ?',
        (current_user.id, today)
    ).fetchone()
    
    if is_batch:
        p_add = float(data.get('proteins', 0.0))
        c_add = float(data.get('carbs', 0.0))
        v_add = float(data.get('veggies', 0.0))
        clean_bonus = int(data.get('clean_bonus', 0))
        
        if record:
            new_p = max(0.0, record['proteins'] + p_add)
            new_c = max(0.0, record['carbs'] + c_add)
            new_v = max(0.0, record['veggies'] + v_add)
            new_clean = max(0, record['clean_score'] + clean_bonus)
            
            conn.execute(
                'UPDATE records SET proteins = ?, carbs = ?, veggies = ?, clean_score = ? WHERE id = ?',
                (new_p, new_c, new_v, new_clean, record['id'])
            )
            print(f"[F-01 後端日誌] 批次更新使用者 ID {current_user.id} 今日飲食：蛋白質+{p_add}, 澱粉+{c_add}, 蔬果+{v_add}。今日累計：P={new_p}, C={new_c}, V={new_v}")
        else:
            p = max(0.0, p_add)
            c = max(0.0, c_add)
            v = max(0.0, v_add)
            cb = max(0, clean_bonus)
            conn.execute(
                'INSERT INTO records (user_id, date, proteins, carbs, veggies, clean_score) VALUES (?, ?, ?, ?, ?, ?)',
                (current_user.id, today, p, c, v, cb)
            )
            print(f"[F-01 後端日誌] 批次新增使用者 ID {current_user.id} 今日飲食：蛋白質={p}, 澱粉={c}, 蔬果={v}")
    else:
        nutrient_type = data.get('type') # 'proteins', 'carbs', 'veggies'
        amount = float(data.get('amount', 1.0))
        clean_bonus = int(data.get('clean_bonus', 0))
        
        # 驗證輸入的營養素類別是否合法
        if nutrient_type not in ['proteins', 'carbs', 'veggies']:
            conn.close()
            return jsonify({'error': 'Invalid nutrient type'}), 400
            
        if record:
            # 情況 A：若今日已有紀錄，則累加新攝取的份數與原型食物評分，並防止份數或評分小於零
            new_amount = record[nutrient_type] + amount
            if new_amount < 0: new_amount = 0
            new_clean_score = record['clean_score'] + clean_bonus
            if new_clean_score < 0: new_clean_score = 0
            
            conn.execute(
                f'UPDATE records SET {nutrient_type} = ?, clean_score = ? WHERE id = ?',
                (new_amount, new_clean_score, record['id'])
            )
            print(f"[F-01 後端日誌] 更新使用者 ID {current_user.id} 今日的 {nutrient_type} 份數為 {new_amount} 份，原型食物獎勵總分累計至 {new_clean_score} 分")
        else:
            # 情況 B：若今日尚無紀錄，則新增一筆今日的初始飲食紀錄
            if amount < 0: amount = 0
            if clean_bonus < 0: clean_bonus = 0
            p, c, v = (amount, 0, 0) if nutrient_type == 'proteins' else (0, amount, 0) if nutrient_type == 'carbs' else (0, 0, amount)
            
            conn.execute(
                'INSERT INTO records (user_id, date, proteins, carbs, veggies, clean_score) VALUES (?, ?, ?, ?, ?, ?)',
                (current_user.id, today, p, c, v, clean_bonus)
            )
            print(f"[F-01 後端日誌] 新增使用者 ID {current_user.id} 今日的初始飲食紀錄：蛋白質 {p} 份, 澱粉 {c} 份, 蔬果 {v} 份, 原型食物獎勵 {clean_bonus} 分")
            
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/targets', methods=['POST'])
@login_required
def update_targets():
    data = request.get_json()
    p = float(data.get('proteins', 3.0))
    c = float(data.get('carbs', 2.0))
    v = float(data.get('veggies', 5.0))
    
    if p < 0 or c < 0 or v < 0:
        return jsonify({'error': 'Invalid target values'}), 400
        
    conn = get_db_connection()
    conn.execute(
        'UPDATE users SET target_proteins = ?, target_carbs = ?, target_veggies = ? WHERE id = ?',
        (p, c, v, current_user.id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
