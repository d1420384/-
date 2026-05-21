let nutritionChart = null;

// 食物營養類別自動偵測關鍵字庫
const FOOD_KEYWORDS = {
    veggies: [
        '花椰菜', '地瓜葉', '高麗菜', '空心菜', '金針菇', '杏鮑菇', '胡蘿蔔', '小黃瓜', '奇異果', '哈密瓜',
        '菠菜', '白菜', '萵苣', '芹菜', '韭菜', '洋蔥', '香菇', '木耳', '絲瓜', '苦瓜', '冬瓜', '黃瓜', '蘿蔔',
        '茄子', '青椒', '彩椒', '蘆筍', '蘋果', '香蕉', '芭樂', '番茄', '西瓜', '芒果', '草莓', '葡萄', '橘子',
        '柳丁', '檸檬', '櫻桃', '鳳梨', '木瓜', '青菜', '蔬菜', '水果', '蔬菜', '菇', '菜', '果', '筍', '瓜', '茄', '椒', '桃', '梨'
    ],
    proteins: [
        '無糖豆漿', '雞胸肉', '優酪乳', '和牛肉',
        '雞肉', '雞胸', '雞腿', '雞翅', '牛肉', '牛排', '豬肉', '羊肉', '排骨', '鮭魚', '鱈魚', '鮪魚', '海鮮',
        '蛋白', '蛋黃', '豆腐', '豆漿', '豆皮', '毛豆', '納豆', '豆干', '牛奶', '起司', '乾酪', '乳酪', '優格',
        '培根', '火腿', '熱狗', '貢丸', '肉丸', '雞蛋', '豬', '牛', '羊', '魚', '肉', '蝦', '蟹', '蛤', '蚵',
        '奶', '蛋', '豆'
    ],
    carbs: [
        '義大利麵', '馬鈴薯',
        '白飯', '糙米', '紫米', '燕麥', '麥片', '藜麥', '薏仁', '拉麵', '泡麵', '吐司', '麵包', '饅頭',
        '包子', '貝果', '蛋餅', '地瓜', '番薯', '紅薯', '芋頭', '南瓜', '山藥', '蓮藕', '栗子', '玉米', '冬粉',
        '米粉', '河粉', '年糕', '湯圓', '披薩', '鬆餅', '餅乾', '蛋糕', '甜點', '米', '飯', '麥', '麵', '粉'
    ]
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Show current date beautifully
    const dateStrEl = document.getElementById('current-date-str');
    if (dateStrEl) {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateStrEl.innerText = today.toLocaleDateString('zh-TW', options);
    }

    // Only init chart if the canvas exists (we are on the index page)
    if (document.getElementById('nutritionChart')) {
        initChart();
        fetchTodayStats();
    }

    // 複合型食物關鍵字比對預設比例庫
    const COMPOSITE_PATTERNS = [
        { key: '便當', p: 1.5, c: 2.0, v: 1.0 },
        { key: '餐盒', p: 1.5, c: 2.0, v: 1.0 },
        { key: '套餐', p: 1.5, c: 2.0, v: 1.0 },
        { key: '三寶飯', p: 2.0, c: 2.0, v: 0.5 },
        { key: '排骨飯', p: 1.5, c: 2.0, v: 0.5 },
        { key: '雞腿飯', p: 2.0, c: 2.0, v: 0.5 },
        { key: '火鍋', p: 2.0, c: 1.0, v: 2.0 },
        { key: '水餃', p: 1.0, c: 2.0, v: 0.5 },
        { key: '漢堡', p: 1.5, c: 1.5, v: 0.2 },
        { key: '丼飯', p: 1.5, c: 2.0, v: 0.5 }
    ];

    // 監聽複合型食物開關切換
    const isCompCheckbox = document.getElementById('isCompositeFood');
    if (isCompCheckbox) {
        isCompCheckbox.addEventListener('change', (e) => {
            const isComp = e.target.checked;
            document.getElementById('singleFoodInputs').style.display = isComp ? 'none' : 'block';
            document.getElementById('compositeFoodInputs').style.display = isComp ? 'block' : 'none';
            
            const singleCategory = document.getElementById('customFoodCategory');
            const singleAmount = document.getElementById('customFoodAmount');
            if (isComp) {
                singleCategory.removeAttribute('required');
                singleAmount.removeAttribute('required');
            } else {
                singleCategory.setAttribute('required', '');
                singleAmount.setAttribute('required', '');
            }
        });
    }

    // 自訂食物名稱自動偵測營養素類別事件監聽
    const customFoodNameInput = document.getElementById('customFoodName');
    if (customFoodNameInput) {
        customFoodNameInput.addEventListener('input', (e) => {
            const name = e.target.value.trim().toLowerCase();
            const categorySelect = document.getElementById('customFoodCategory');
            const suggestionEl = document.getElementById('categorySuggestion');
            
            if (!name) {
                suggestionEl.style.display = 'none';
                return;
            }

            // A. 先比對是否為複合型食物（如便當、火鍋）
            let detectedComp = null;
            for (const pattern of COMPOSITE_PATTERNS) {
                if (name.includes(pattern.key)) {
                    detectedComp = pattern;
                    break;
                }
            }

            if (detectedComp) {
                // 自動勾選複合開關並觸發顯示
                if (isCompCheckbox && !isCompCheckbox.checked) {
                    isCompCheckbox.checked = true;
                    isCompCheckbox.dispatchEvent(new Event('change'));
                }
                
                // 預填估計比例
                document.getElementById('compProtein').value = detectedComp.p;
                document.getElementById('compCarb').value = detectedComp.c;
                document.getElementById('compVeggie').value = detectedComp.v;
                
                suggestionEl.innerText = `✨ 系統偵測為「${detectedComp.key}」，已為您自動拆分填入預估比例！`;
                suggestionEl.className = "form-text mt-1 text-success fw-semibold";
                suggestionEl.style.display = 'block';
                return;
            }
            
            // B. 若非複合型食物，則走原本的單一營養素匹配邏輯
            let detectedCategory = null;
            const keywordList = [];
            for (const [cat, keywords] of Object.entries(FOOD_KEYWORDS)) {
                for (const kw of keywords) {
                    keywordList.push({ cat, kw, len: kw.length });
                }
            }
            keywordList.sort((a, b) => b.len - a.len);
            
            for (const item of keywordList) {
                if (name.includes(item.kw)) {
                    detectedCategory = item.cat;
                    break;
                }
            }
            
            if (detectedCategory) {
                if (isCompCheckbox && isCompCheckbox.checked) {
                    // 若當前是複合模式但打入了單一食物，不強迫切回單一，但提示使用者
                    suggestionEl.innerText = `💡 偵測到此食物可能為：${detectedCategory === 'proteins' ? '蛋白質' : detectedCategory === 'carbs' ? '澱粉' : '蔬果'}`;
                    suggestionEl.className = "form-text mt-1 text-info fw-semibold";
                    suggestionEl.style.display = 'block';
                } else {
                    categorySelect.value = detectedCategory;
                    let catName = '';
                    if (detectedCategory === 'proteins') catName = '🥩 蛋白質';
                    else if (detectedCategory === 'carbs') catName = '🌾 澱粉';
                    else if (detectedCategory === 'veggies') catName = '🥦 蔬果';
                    
                    suggestionEl.innerText = `✨ 系統自動偵測分類為：${catName}`;
                    suggestionEl.className = "form-text mt-1 text-success fw-semibold";
                    suggestionEl.style.display = 'block';
                }
            } else {
                suggestionEl.innerText = isCompCheckbox.checked ? 
                    `💡 目前正以「複合型食物」填寫，可自行分配各項份數` : 
                    `❓ 找不到匹配的類別，請您手動選擇`;
                suggestionEl.className = "form-text mt-1 text-muted fw-semibold";
                suggestionEl.style.display = 'block';
            }
        });
    }
});

function initChart() {
    const ctx = document.getElementById('nutritionChart').getContext('2d');
    
    // Initial empty chart
    nutritionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['蛋白質', '澱粉', '蔬果'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#E07A5F', // Protein (Terracotta)
                    '#F2CC8F', // Carbs (Warm Yellow)
                    '#81B29A'  // Veggies (Sage Green)
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '76%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 13,
                            family: "'Outfit', 'Noto Sans TC', sans-serif",
                            weight: '600'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // If it's the grey placeholder, display 0
                            const isPlaceholder = nutritionChart.data.datasets[0].backgroundColor[0] === '#e2e8f0';
                            const val = isPlaceholder ? 0 : context.raw;
                            return ` ${context.label}: ${val} 份`;
                        }
                    }
                }
            }
        }
    });
}

function fetchTodayStats() {
    fetch('/api/today')
        .then(response => response.json())
        .then(data => {
            updateUI(
                data.proteins, 
                data.carbs, 
                data.veggies, 
                data.clean_score,
                data.target_proteins,
                data.target_carbs,
                data.target_veggies
            );
        })
        .catch(error => console.error('Error fetching stats:', error));
}

function addNutrient(type, amount, cleanBonus = 0) {
    fetch('/api/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: type,
            amount: amount,
            clean_bonus: cleanBonus
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Re-fetch stats to update UI and chart
            fetchTodayStats();
            
            // Add a clean click micro-animation feedback if cleanBonus > 0
            if (cleanBonus > 0) {
                showRewardPopup(cleanBonus);
            }
        } else {
            alert('紀錄失敗，請稍後再試');
        }
    })
    .catch(error => console.error('Error saving record:', error));
}

function updateUI(proteins, carbs, veggies, cleanScore, tp, tc, tv) {
    // Update raw labels
    document.getElementById('val-proteins').innerText = proteins;
    document.getElementById('val-carbs').innerText = carbs;
    document.getElementById('val-veggies').innerText = veggies;
    
    // Update clean eating score
    document.getElementById('val-clean-score').innerText = cleanScore;
    
    // Update target indicators
    document.getElementById('target-val-proteins').innerText = tp.toFixed(1);
    document.getElementById('target-val-carbs').innerText = tc.toFixed(1);
    document.getElementById('target-val-veggies').innerText = tv.toFixed(1);

    document.getElementById('progress-val-proteins').innerText = proteins.toFixed(1);
    document.getElementById('progress-val-carbs').innerText = carbs.toFixed(1);
    document.getElementById('progress-val-veggies').innerText = veggies.toFixed(1);

    // Update targets modal inputs so they match
    document.getElementById('targetProteinInput').value = tp;
    document.getElementById('targetCarbInput').value = tc;
    document.getElementById('targetVegInput').value = tv;

    // Calculate progress percentages
    const pctP = Math.min((proteins / tp) * 100, 100);
    const pctC = Math.min((carbs / tc) * 100, 100);
    const pctV = Math.min((veggies / tv) * 100, 100);

    // Update progress bars widths
    document.getElementById('bar-proteins').style.width = pctP + '%';
    document.getElementById('bar-carbs').style.width = pctC + '%';
    document.getElementById('bar-veggies').style.width = pctV + '%';

    // Calculate total servings
    const totalServings = proteins + carbs + veggies;
    document.getElementById('val-total-servings').innerText = totalServings.toFixed(1);

    // Update chart
    if (nutritionChart) {
        if (proteins === 0 && carbs === 0 && veggies === 0) {
            // Show placeholder grey chart
            nutritionChart.data.datasets[0].data = [1, 1, 1];
            nutritionChart.data.datasets[0].backgroundColor = ['#e2e8f0', '#e2e8f0', '#e2e8f0'];
        } else {
            // Show actual nutrient chart
            nutritionChart.data.datasets[0].data = [proteins, carbs, veggies];
            nutritionChart.data.datasets[0].backgroundColor = ['#E07A5F', '#F2CC8F', '#81B29A'];
        }
        nutritionChart.update();
    }
function submitCustomFood() {
    const name = document.getElementById('customFoodName').value;
    const isCompCheckbox = document.getElementById('isCompositeFood');
    const isComp = isCompCheckbox ? isCompCheckbox.checked : false;

    if (!name) {
        alert('請輸入食物名稱！');
        return;
    }

    // 取得選填的配菜所提供的營養素 (支援複選)
    let extraP = 0, extraC = 0, extraV = 0;
    if (document.getElementById('sd_egg') && document.getElementById('sd_egg').checked) extraP += 1.0;
    if (document.getElementById('sd_tofu') && document.getElementById('sd_tofu').checked) extraP += 1.0;
    if (document.getElementById('sd_green') && document.getElementById('sd_green').checked) extraV += 1.0;
    if (document.getElementById('sd_fruit') && document.getElementById('sd_fruit').checked) extraV += 1.0;
    if (document.getElementById('sd_sweetpotato') && document.getElementById('sd_sweetpotato').checked) extraC += 1.0;
    if (document.getElementById('sd_drink') && document.getElementById('sd_drink').checked) extraC += 1.0;

    if (isComp) {
        const p = (parseFloat(document.getElementById('compProtein').value) || 0) + extraP;
        const c = (parseFloat(document.getElementById('compCarb').value) || 0) + extraC;
        const v = (parseFloat(document.getElementById('compVeggie').value) || 0) + extraV;

        fetch('/api/record', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_batch: true,
                proteins: p,
                carbs: c,
                veggies: v,
                clean_bonus: 0
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchTodayStats();
            } else {
                alert('紀錄失敗，請稍後再試');
            }
        })
        .catch(error => console.error('Error saving record:', error));
    } else {
        const category = document.getElementById('customFoodCategory').value;
        const amount = parseFloat(document.getElementById('customFoodAmount').value);

        if (!category || isNaN(amount) || amount <= 0) {
            alert('請完整選擇主要營養類別，並輸入有效的份數！');
            return;
        }

        // 若有額外加點配菜，則改用 batch 批次方式送出
        if (extraP > 0 || extraC > 0 || extraV > 0) {
            let p = 0, c = 0, v = 0;
            if (category === 'proteins') p = amount;
            else if (category === 'carbs') c = amount;
            else if (category === 'veggies') v = amount;

            p += extraP;
            c += extraC;
            v += extraV;

            fetch('/api/record', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    is_batch: true,
                    proteins: p,
                    carbs: c,
                    veggies: v,
                    clean_bonus: 0
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchTodayStats();
                } else {
                    alert('紀錄失敗，請稍後再試');
                }
            })
            .catch(error => console.error('Error saving record:', error));
        } else {
            // 純單一食物且無額外配菜，走標準記錄
            addNutrient(category, amount, 0);
        }
    }

    // Close the modal
    const modalEl = document.getElementById('customFoodModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();

    // Reset the form
    document.getElementById('customFoodForm').reset();
    
    // 重設開關顯示與配餐核取狀態
    if (isCompCheckbox) {
        isCompCheckbox.checked = false;
        document.getElementById('singleFoodInputs').style.display = 'block';
        document.getElementById('compositeFoodInputs').style.display = 'none';
        document.getElementById('customFoodCategory').setAttribute('required', '');
        document.getElementById('customFoodAmount').setAttribute('required', '');
        document.getElementById('categorySuggestion').style.display = 'none';
    }
    
    // 清除所有配餐選取按鈕
    const sdIds = ['sd_egg', 'sd_tofu', 'sd_green', 'sd_fruit', 'sd_sweetpotato', 'sd_drink'];
    sdIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
}

function submitTargets() {
    const p = parseFloat(document.getElementById('targetProteinInput').value);
    const c = parseFloat(document.getElementById('targetCarbInput').value);
    const v = parseFloat(document.getElementById('targetVegInput').value);

    if (isNaN(p) || p <= 0 || isNaN(c) || c <= 0 || isNaN(v) || v <= 0) {
        alert('請輸入有效的目標份數！');
        return;
    }

    fetch('/api/targets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            proteins: p,
            carbs: c,
            veggies: v
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Re-fetch to update UI
            fetchTodayStats();
            
            // Close the targets modal
            const modalEl = document.getElementById('targetsModal');
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.hide();
        } else {
            alert('目標儲存失敗，請稍後再試');
        }
    })
    .catch(error => console.error('Error saving targets:', error));
}

// Reward Popup Effect
function showRewardPopup(score) {
    // Create temporary reward popup element
    const popup = document.createElement('div');
    popup.className = 'position-fixed translate-middle bg-success text-white px-3 py-2 rounded-pill shadow-lg border border-white border-opacity-30';
    popup.style.left = '50%';
    popup.style.top = '25%';
    popup.style.zIndex = '9999';
    popup.style.opacity = '0';
    popup.style.transition = 'all 0.6s ease-out';
    popup.innerHTML = `🌟 吃得乾淨！原型食物積分 +${score} 🌟`;
    
    document.body.appendChild(popup);
    
    // Animation triggers
    setTimeout(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translate(-50%, -15px)';
    }, 50);

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translate(-50%, -40px)';
    }, 1500);

    setTimeout(() => {
        popup.remove();
    }, 2100);
}
