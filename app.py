from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from db import get_db_connection, init_db
import os

app = Flask(__name__)
app.secret_key = 'super_secret_key_for_nutrition_app'

# Initialize DB if not exists
init_db()

@app.route('/')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('dashboard'))
        else:
            return render_template('login.html', error='帳號或密碼錯誤')
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        if user:
            conn.close()
            return render_template('login.html', error='帳號已存在', is_register=True)
            
        hashed_password = generate_password_hash(password)
        conn.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, hashed_password))
        conn.commit()
        conn.close()
        return redirect(url_for('login'))
        
    return render_template('login.html', is_register=True)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/history')
def history():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('history.html')

@app.route('/api/record', methods=['POST'])
def add_record():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': '未登入'}), 401
        
    data = request.json
    protein = data.get('protein', 0)
    carb = data.get('carb', 0)
    veg = data.get('veg', 0)
    food_name = data.get('food_name', '')
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO records (user_id, date, protein_portions, carb_portions, veg_portions, food_name)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (session['user_id'], today, protein, carb, veg, food_name))
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success'})

@app.route('/api/today', methods=['GET'])
def get_today_stats():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': '未登入'}), 401
        
    today = datetime.now().strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    stats = conn.execute('''
        SELECT 
            SUM(protein_portions) as total_protein,
            SUM(carb_portions) as total_carb,
            SUM(veg_portions) as total_veg
        FROM records 
        WHERE user_id = ? AND date = ?
    ''', (session['user_id'], today)).fetchone()
    conn.close()
    
    return jsonify({
        'status': 'success',
        'data': {
            'protein': stats['total_protein'] or 0,
            'carb': stats['total_carb'] or 0,
            'veg': stats['total_veg'] or 0
        }
    })

@app.route('/api/history', methods=['GET'])
def get_history_stats():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': '未登入'}), 401
        
    seven_days_ago = (datetime.now() - timedelta(days=6)).strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    records = conn.execute('''
        SELECT date, 
               SUM(protein_portions) as protein,
               SUM(carb_portions) as carb,
               SUM(veg_portions) as veg
        FROM records 
        WHERE user_id = ? AND date >= ?
        GROUP BY date
        ORDER BY date DESC
    ''', (session['user_id'], seven_days_ago)).fetchall()
    
    # Also get raw records to show history list
    raw_records = conn.execute('''
        SELECT date, protein_portions, carb_portions, veg_portions, food_name
        FROM records
        WHERE user_id = ? AND date >= ?
        ORDER BY id DESC
    ''', (session['user_id'], seven_days_ago)).fetchall()
    
    conn.close()
    
    return jsonify({
        'status': 'success',
        'daily_stats': [dict(row) for row in records],
        'raw_records': [dict(row) for row in raw_records]
    })

if __name__ == '__main__':
    app.run(debug=True)
