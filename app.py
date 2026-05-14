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

class User(UserMixin):
    def __init__(self, id, username):
        self.id = id
        self.username = username

@login_manager.user_loader
def load_user(user_id):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    if user is None:
        return None
    return User(user['id'], user['username'])

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
        'SELECT date, proteins, carbs, veggies FROM records WHERE user_id = ? ORDER BY date DESC LIMIT 7',
        (current_user.id,)
    ).fetchall()
    conn.close()
    return render_template('history.html', records=records)

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
            user_obj = User(user['id'], user['username'])
            login_user(user_obj)
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
        'SELECT proteins, carbs, veggies FROM records WHERE user_id = ? AND date = ?',
        (current_user.id, today)
    ).fetchone()
    conn.close()
    
    if record:
        return jsonify({'proteins': record['proteins'], 'carbs': record['carbs'], 'veggies': record['veggies']})
    else:
        return jsonify({'proteins': 0, 'carbs': 0, 'veggies': 0})

@app.route('/api/record', methods=['POST'])
@login_required
def add_record():
    data = request.get_json()
    nutrient_type = data.get('type') # 'proteins', 'carbs', 'veggies'
    amount = float(data.get('amount', 1.0))
    
    if nutrient_type not in ['proteins', 'carbs', 'veggies']:
        return jsonify({'error': 'Invalid nutrient type'}), 400
        
    today = datetime.date.today().isoformat()
    conn = get_db_connection()
    record = conn.execute(
        'SELECT id, proteins, carbs, veggies FROM records WHERE user_id = ? AND date = ?',
        (current_user.id, today)
    ).fetchone()
    
    if record:
        # Update existing record
        new_amount = record[nutrient_type] + amount
        if new_amount < 0: new_amount = 0
        conn.execute(
            f'UPDATE records SET {nutrient_type} = ? WHERE id = ?',
            (new_amount, record['id'])
        )
    else:
        # Create new record
        if amount < 0: amount = 0
        p, c, v = (amount, 0, 0) if nutrient_type == 'proteins' else (0, amount, 0) if nutrient_type == 'carbs' else (0, 0, amount)
        conn.execute(
            'INSERT INTO records (user_id, date, proteins, carbs, veggies) VALUES (?, ?, ?, ?, ?)',
            (current_user.id, today, p, c, v)
        )
        
    conn.commit()
    conn.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
