let nutritionChart = null;
let currentChartType = localStorage.getItem('preferredChartType') || 'doughnut';
let currentStats = {
    proteins: 0,
    carbs: 0,
    veggies: 0,
    target_proteins: 3.0,
    target_carbs: 2.0,
    target_veggies: 5.0
};

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
    // Initialize date selector to today
    const dateInput = document.getElementById('selected-date');
    if (dateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        
        dateInput.addEventListener('change', () => {
            fetchTodayStats();
        });
    }

    // Only init chart if the canvas exists (we are on the index page)
    if (document.getElementById('nutritionChart')) {
        // Listen for chart type toggle
        const doughnutRadio = document.getElementById('chart-doughnut');
        const barRadio = document.getElementById('chart-bar');
        
        if (doughnutRadio && barRadio) {
            // Set initial checked state based on preferred chart type
            if (currentChartType === 'bar') {
                barRadio.checked = true;
            } else {
                doughnutRadio.checked = true;
            }

            doughnutRadio.addEventListener('change', () => {
                if (doughnutRadio.checked) {
                    currentChartType = 'doughnut';
                    localStorage.setItem('preferredChartType', 'doughnut');
                    renderChart();
                }
            });
            
            barRadio.addEventListener('change', () => {
                if (barRadio.checked) {
                    currentChartType = 'bar';
                    localStorage.setItem('preferredChartType', 'bar');
                    renderChart();
                }
            });
        }
        
        initChart();
        fetchTodayStats();
        loadHomeShortcuts();
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
                
                suggestionEl.innerText = `✨ 系統偵測為複合型食物「${detectedComp.key}」，請於下方輸入食物與配菜組成！`;
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

    // 監聽自訂配菜輸入與智慧分析
    const customSideDishesInput = document.getElementById('customSideDishes');
    if (customSideDishesInput) {
        customSideDishesInput.addEventListener('input', (e) => {
            const text = e.target.value.trim();
            const analysisEl = document.getElementById('sideDishesAnalysis');
            const listEl = document.getElementById('sideDishesList');
            const calcP = document.getElementById('sd-calc-protein');
            const calcC = document.getElementById('sd-calc-carb');
            const calcV = document.getElementById('sd-calc-veggie');
            
            if (!text) {
                analysisEl.style.display = 'none';
                return;
            }
            
            const result = analyzeSideDishes(text);
            
            // Render detected items
            listEl.innerHTML = '';
            result.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'd-flex justify-content-between align-items-center mb-1';
                
                let badgeClass = 'bg-secondary bg-opacity-10 text-secondary';
                if (item.category === 'proteins') badgeClass = 'bg-danger bg-opacity-10 color-protein';
                else if (item.category === 'carbs') badgeClass = 'bg-warning bg-opacity-10 color-carb';
                else if (item.category === 'veggies') badgeClass = 'bg-success bg-opacity-10 color-veggie';
                
                itemDiv.innerHTML = `
                    <div>${item.emoji} <span class="fw-semibold text-dark">${item.name}</span></div>
                    <span class="badge ${badgeClass} rounded-pill font-monospace fw-bold px-2.5 py-1.5" style="font-size: 0.75rem;">
                        ${item.catName} +${item.val.toFixed(1)} 份
                    </span>
                `;
                listEl.appendChild(itemDiv);
            });
            
            // Update summary counters
            calcP.innerText = result.proteins.toFixed(1);
            calcC.innerText = result.carbs.toFixed(1);
            calcV.innerText = result.veggies.toFixed(1);
            
            analysisEl.style.display = 'block';
        });
    }
});

function initChart() {
    renderChart();
}

function renderChart() {
    const canvas = document.getElementById('nutritionChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (nutritionChart) {
        nutritionChart.destroy();
    }
    
    const centerText = document.getElementById('chart-center-text');
    
    if (currentChartType === 'doughnut') {
        if (centerText) centerText.style.display = 'flex';
        
        let dataVals = [currentStats.proteins, currentStats.carbs, currentStats.veggies];
        let bgColors = ['#E07A5F', '#D4A373', '#81B29A'];
        const isZero = currentStats.proteins === 0 && currentStats.carbs === 0 && currentStats.veggies === 0;
        
        if (isZero) {
            dataVals = [1, 1, 1];
            bgColors = ['#e2e8f0', '#e2e8f0', '#e2e8f0'];
        }
        
        nutritionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['蛋白質', '澱粉', '蔬果'],
                datasets: [{
                    data: dataVals,
                    backgroundColor: bgColors,
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
                                const val = isZero ? 0 : context.raw;
                                const total = isZero ? 0 : (currentStats.proteins + currentStats.carbs + currentStats.veggies);
                                const pct = (isZero || total === 0) ? '0.0' : ((val / total) * 100).toFixed(1);
                                return ` ${context.label}: ${val} 份 (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else {
        // Bar Chart mode
        if (centerText) centerText.style.display = 'none';
        
        nutritionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['蛋白質', '澱粉', '蔬果'],
                datasets: [
                    {
                        label: '已攝取 (份)',
                        data: [currentStats.proteins, currentStats.carbs, currentStats.veggies],
                        backgroundColor: ['#E07A5F', '#D4A373', '#81B29A'],
                        borderRadius: 6,
                        borderWidth: 0,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    },
                    {
                        label: '每日目標 (份)',
                        data: [currentStats.target_proteins, currentStats.target_carbs, currentStats.target_veggies],
                        backgroundColor: ['rgba(224, 122, 95, 0.15)', 'rgba(212, 163, 115, 0.15)', 'rgba(129, 178, 154, 0.15)'],
                        borderColor: ['#E07A5F', '#D4A373', '#81B29A'],
                        borderWidth: 1.5,
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
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
                                return ` ${context.dataset.label}: ${context.raw.toFixed(1)} 份`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 12,
                                family: "'Outfit', 'Noto Sans TC', sans-serif",
                                weight: '600'
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11,
                                family: "'Outfit', 'Noto Sans TC', sans-serif"
                            }
                        }
                    }
                }
            }
        });
    }
}

function fetchTodayStats() {
    const dateInput = document.getElementById('selected-date');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    fetch(`/api/today?date=${selectedDate}`)
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
    const dateInput = document.getElementById('selected-date');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    fetch('/api/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: type,
            amount: amount,
            clean_bonus: cleanBonus,
            date: selectedDate
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
    // Save to global stats
    currentStats.proteins = proteins;
    currentStats.carbs = carbs;
    currentStats.veggies = veggies;
    currentStats.target_proteins = tp;
    currentStats.target_carbs = tc;
    currentStats.target_veggies = tv;

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

    // Render/update chart
    renderChart();
}

function submitCustomFood() {
    const name = document.getElementById('customFoodName').value;
    const isCompCheckbox = document.getElementById('isCompositeFood');
    const isComp = isCompCheckbox ? isCompCheckbox.checked : false;

    if (!name) {
        alert('請輸入食物名稱！');
        return;
    }

    // 取得自訂配菜分析結果
    let extraP = 0, extraC = 0, extraV = 0;
    const sideDishesInput = document.getElementById('customSideDishes');
    if (sideDishesInput && isComp) {
        const sideDishesText = sideDishesInput.value.trim();
        const analysis = analyzeSideDishes(sideDishesText);
        extraP = analysis.proteins;
        extraC = analysis.carbs;
        extraV = analysis.veggies;
    }

    if (isComp) {
        const p = extraP;
        const c = extraC;
        const v = extraV;

        const dateInput = document.getElementById('selected-date');
        const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

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
                clean_bonus: 0,
                date: selectedDate
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

        // 單一食物直接記錄即可
        addNutrient(category, amount, 0);
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
    
    // 清除自訂配菜內容與分析面板
    if (sideDishesInput) {
        sideDishesInput.value = '';
    }
    const analysisEl = document.getElementById('sideDishesAnalysis');
    if (analysisEl) {
        analysisEl.style.display = 'none';
    }
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

// Parse quantity in various formats (numbers, Chinese words, fractions)
function parseChineseNum(str) {
    if (str.includes('半')) return 0.5;
    if (str.includes('一') || str.includes('1')) return 1.0;
    if (str.includes('二') || str.includes('兩') || str.includes('2')) return 2.0;
    if (str.includes('三') || str.includes('3')) return 3.0;
    if (str.includes('四') || str.includes('4')) return 4.0;
    if (str.includes('五') || str.includes('5')) return 5.0;
    if (str.includes('六') || str.includes('6')) return 6.0;
    if (str.includes('七') || str.includes('7')) return 7.0;
    if (str.includes('八') || str.includes('8')) return 8.0;
    if (str.includes('九') || str.includes('9')) return 9.0;
    if (str.includes('十') || str.includes('10')) return 10.0;
    
    const val = parseFloat(str);
    return isNaN(val) ? 1.0 : val;
}

// Analyze side dishes typed in the text input
function analyzeSideDishes(text) {
    if (!text) {
        return { proteins: 0, carbs: 0, veggies: 0, items: [] };
    }
    
    // Split by commas, spaces, pluses, semicolons
    const rawItems = text.split(/[,，、\s+\+；;]/).map(x => x.trim()).filter(x => x.length > 0);
    
    let totalP = 0;
    let totalC = 0;
    let totalV = 0;
    const detectedItems = [];
    
    // Build a sorted keyword list for matching
    const keywordList = [];
    for (const [cat, keywords] of Object.entries(FOOD_KEYWORDS)) {
        for (const kw of keywords) {
            keywordList.push({ cat, kw, len: kw.length });
        }
    }
    keywordList.sort((a, b) => b.len - a.len);

    for (const item of rawItems) {
        let multiplier = 1.0;
        let cleanItemName = item;
        
        // Match numbers like 1.5, 2, 0.5 or Chinese numbers like 一, 二, 三, 半 at start
        const numMatch = item.match(/^([0-9]+(?:\.[0-9]+)?|半|[一二三四五六七八九十兩]|[0-9]+個|[0-9]+顆|[0-9]+碗|[0-9]+份)/);
        if (numMatch) {
            const rawNum = numMatch[1];
            multiplier = parseChineseNum(rawNum);
            // Remove the quantity prefix from cleanItemName
            cleanItemName = item.substring(rawNum.length).trim();
            // Remove leading measure words
            cleanItemName = cleanItemName.replace(/^[顆個碗份支盤杯片把條克g分]/, '').trim();
        } else {
            // Find if there is a number/quantity at the end of the item (e.g. "荷包蛋 2", "白飯 半")
            const endNumMatch = item.match(/([0-9]+(?:\.[0-9]+)?|半)$/);
            if (endNumMatch) {
                const rawNum = endNumMatch[1];
                multiplier = parseChineseNum(rawNum);
                cleanItemName = item.substring(0, item.length - rawNum.length).trim();
            }
        }

        // Match category using the sorted keywords
        let category = null;
        for (const k of keywordList) {
            if (cleanItemName.includes(k.kw)) {
                category = k.cat;
                break;
            }
        }
        
        if (category) {
            let catName = '';
            let emoji = '';
            let val = multiplier;
            if (category === 'proteins') {
                totalP += val;
                catName = '蛋白質';
                emoji = '🥩';
            } else if (category === 'carbs') {
                totalC += val;
                catName = '澱粉';
                emoji = '🌾';
            } else if (category === 'veggies') {
                totalV += val;
                catName = '蔬果';
                emoji = '🥦';
            }
            detectedItems.push({
                raw: item,
                name: cleanItemName,
                category: category,
                catName: catName,
                emoji: emoji,
                val: val
            });
        } else {
            // Unrecognized item
            detectedItems.push({
                raw: item,
                name: cleanItemName,
                category: 'unknown',
                catName: '未知 (不計份數)',
                emoji: '❓',
                val: 0
            });
        }
    }
    
    return {
        proteins: totalP,
        carbs: totalC,
        veggies: totalV,
        items: detectedItems
    };
}

function loadHomeShortcuts() {
    const container = document.getElementById('shortcuts-container');
    if (!container) return;
    
    fetch('/api/shortcuts')
        .then(res => res.json())
        .then(data => {
            container.innerHTML = '';
            if (data.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-3">
                        <small class="text-muted">沒有自訂快捷鍵，請點選右上角「快捷鍵設定」進行設定！</small>
                    </div>
                `;
                return;
            }
            
            data.forEach(item => {
                const col = document.createElement('div');
                col.className = 'col-sm-6';
                
                let portionsDesc = [];
                if (item.proteins > 0) portionsDesc.push(`+${item.proteins.toFixed(1)} 蛋白質`);
                if (item.carbs > 0) portionsDesc.push(`+${item.carbs.toFixed(1)} 澱粉`);
                if (item.veggies > 0) portionsDesc.push(`+${item.veggies.toFixed(1)} 蔬果`);
                const descStr = portionsDesc.join('、') || '無設定';

                col.innerHTML = `
                    <button class="food-card-btn d-flex align-items-center p-3 border hover-shadow" onclick='recordShortcutClick(${JSON.stringify(item).replace(/'/g, "\\'")})'>
                        <span class="fs-2 me-3">${item.emoji}</span>
                        <div class="text-start">
                            <div class="fw-bold text-dark">${item.name}</div>
                            <small class="text-muted d-block">${descStr}</small>
                            <span class="badge bg-success bg-opacity-10 text-success font-monospace" style="font-size: 0.7rem;">⭐ 獎勵 +${item.clean_score}分</span>
                        </div>
                    </button>
                `;
                container.appendChild(col);
            });
        })
        .catch(err => {
            console.error('Error loading home shortcuts:', err);
            container.innerHTML = `
                <div class="col-12 text-center py-3 text-danger">
                    <small>載入快捷鍵失敗</small>
                </div>
            `;
        });
}

function recordShortcutClick(item) {
    const dateInput = document.getElementById('selected-date');
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    fetch('/api/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            is_batch: true,
            proteins: item.proteins,
            carbs: item.carbs,
            veggies: item.veggies,
            clean_bonus: item.clean_score,
            date: selectedDate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchTodayStats();
            if (item.clean_score > 0) {
                showRewardPopup(item.clean_score);
            }
        } else {
            alert('紀錄失敗，請稍後再試');
        }
    })
    .catch(error => console.error('Error saving shortcut record:', error));
}

