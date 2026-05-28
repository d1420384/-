let nutritionChart = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only init chart if the canvas exists (we are on the index page)
    if (document.getElementById('nutritionChart')) {
        initChart();
        fetchTodayStats();
    }
});

function initChart() {
    const ctx = document.getElementById('nutritionChart').getContext('2d');
    
    nutritionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['蛋白質', '澱粉', '蔬果'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#e26d5c', // Protein (Terracotta)
                    '#e9b44c', // Carbs (Warm Gold)
                    '#5c9e83'  // Veggies (Sage Green)
                ],
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    display: false // Hide default legend; we use progress bars for clear details
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} 份`;
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
            updateUI(data.proteins, data.carbs, data.veggies, data.whole_foods);
        })
        .catch(error => console.error('Error fetching stats:', error));
}

function addNutrient(type, amount, isWholeFood = false) {
    fetch('/api/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: type,
            amount: amount,
            is_whole_food: isWholeFood
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchTodayStats();
            showToast(amount > 0 ? "已成功新增紀錄！" : "已成功減去份數！", "success");
        } else {
            showToast('紀錄失敗，請稍後再試', 'danger');
        }
    })
    .catch(error => {
        console.error('Error saving record:', error);
        showToast('與伺服器連線失敗', 'danger');
    });
}

function updateUI(proteins, carbs, veggies, wholeFoods) {
    // 1. Update text totals in the quick record view
    document.getElementById('val-proteins').innerText = proteins;
    document.getElementById('val-carbs').innerText = carbs;
    document.getElementById('val-veggies').innerText = veggies;

    // 2. Define target amounts
    const targetP = 3;
    const targetC = 2;
    const targetV = 5;

    // 3. Update Progress Trackers
    updateProgressBar('proteins', proteins, targetP);
    updateProgressBar('carbs', carbs, targetC);
    updateProgressBar('veggies', veggies, targetV);

    // 4. Update Doughnut Chart (Chart.js)
    if (nutritionChart) {
        // If all are 0, chart will draw an empty gray ring
        if (proteins === 0 && carbs === 0 && veggies === 0) {
            nutritionChart.data.datasets[0].data = [0, 0, 0];
        } else {
            nutritionChart.data.datasets[0].data = [proteins, carbs, veggies];
        }
        nutritionChart.update();
    }

    // 5. Update Daily Achievement Banner
    const banner = document.getElementById('achievement-banner');
    const title = document.getElementById('achievement-title');
    const desc = document.getElementById('achievement-desc');
    
    const meetsP = proteins >= targetP;
    const meetsC = carbs >= targetC;
    const meetsV = veggies >= targetV;

    if (meetsP && meetsC && meetsV) {
        banner.className = "alert alert-success border-success border-opacity-25 rounded-4 p-3 d-flex align-items-center mb-0 shadow-sm";
        title.innerText = "🎉 完美達成！今日飲食完美均衡！";
        title.className = "fw-bold mb-1 text-success";
        desc.innerText = "您已成功攝取足夠的蛋白質、澱粉與蔬果，請繼續維持優良的健康習慣！";
    } else if (proteins > 0 || carbs > 0 || veggies > 0) {
        banner.className = "alert alert-warning border-warning border-opacity-25 rounded-4 p-3 d-flex align-items-center mb-0 shadow-sm";
        title.innerText = "🥗 正在前進！繼續補充需要的營養！";
        title.className = "fw-bold mb-1 text-warning text-dark";
        
        let missing = [];
        if (!meetsP) missing.push(`蛋白質 ${targetP - proteins} 份`);
        if (!meetsC) missing.push(`澱粉 ${targetC - carbs} 份`);
        if (!meetsV) missing.push(`蔬果 ${targetV - veggies} 份`);
        
        desc.innerText = `距離今日均衡目標，還需要補充：${missing.join('、')}。加油！`;
    } else {
        banner.className = "alert alert-light border rounded-4 p-3 d-flex align-items-center mb-0";
        title.innerText = "🍽️ 今日飲食紀錄中";
        title.className = "fw-bold mb-1 text-dark";
        desc.innerText = "點選上方按鈕或快捷鍵，開始記錄您的第一餐！";
    }

    // 6. Update Whole Food Reward Panel
    document.getElementById('badge-points').innerText = `${wholeFoods} 點`;
    
    // Draw stars
    const starContainer = document.getElementById('star-rating-container');
    let starsHtml = '';
    const maxStars = 5;
    const filledCount = Math.min(Math.floor(wholeFoods), maxStars);
    
    for (let i = 1; i <= maxStars; i++) {
        if (i <= filledCount) {
            starsHtml += '<i class="bi bi-star-fill text-warning me-1"></i>';
        } else {
            starsHtml += '<i class="bi bi-star-fill star-empty me-1"></i>';
        }
    }
    starContainer.innerHTML = starsHtml;

    // Update level title and description
    const levelTitle = document.getElementById('reward-level-title');
    const levelDesc = document.getElementById('reward-level-desc');

    if (wholeFoods === 0) {
        levelTitle.innerText = "🌱 萌芽階段";
        levelDesc.innerText = "多吃地瓜、雞胸肉、蔬菜等原型食物，解鎖健康勳章！";
    } else if (wholeFoods <= 2) {
        levelTitle.innerText = "🌿 綠意盎然 (銅牌獎勵)";
        levelDesc.innerText = "太棒了！已獲得銅牌健康獎勵，繼續優先挑選原型食物吧！";
    } else if (wholeFoods <= 4) {
        levelTitle.innerText = "🌸 花開富貴 (銀牌勳章)";
        levelDesc.innerText = "非常讚！已獲得銀牌健康勳章，您的身體正在感謝您的健康飲食！";
    } else {
        levelTitle.innerText = "🏆 原型食物大師 (黃金加冕)";
        levelDesc.innerText = "完美！您今天攝取了豐富的原型食物，已獲得最高榮譽黃金大師勳章！";
    }
}

function updateProgressBar(id, current, target) {
    const textEl = document.getElementById(`progress-text-${id}`);
    const barEl = document.getElementById(`progress-bar-${id}`);
    
    if (textEl && barEl) {
        textEl.innerText = `${current} / ${target} 份`;
        
        let percent = (current / target) * 100;
        if (percent > 100) percent = 100;
        barEl.style.width = `${percent}%`;
        
        // Add active classes for goal achieved
        if (current >= target) {
            barEl.classList.add('shadow-sm');
        } else {
            barEl.classList.remove('shadow-sm');
        }
    }
}

function submitCustomFood() {
    const name = document.getElementById('customFoodName').value;
    const category = document.getElementById('customFoodCategory').value;
    const amount = parseFloat(document.getElementById('customFoodAmount').value);
    const isWhole = document.getElementById('customFoodIsWhole').checked;

    if (!name || !category || isNaN(amount) || amount <= 0) {
        showToast('請完整填寫食物名稱、選擇類別，並輸入有效的份數！', 'danger');
        return;
    }

    addNutrient(category, amount, isWhole);

    // Close the modal
    const modalEl = document.getElementById('customFoodModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();

    // Reset the form
    document.getElementById('customFoodForm').reset();
    document.getElementById('customFoodIsWhole').checked = true; // reset switch to checked
}

function showToast(message, type = "success") {
    const toastEl = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toast-message');
    
    if (toastEl && toastMessage) {
        toastMessage.innerText = message;
        
        // Set styling based on type
        toastEl.className = `toast align-items-center text-white border-0 rounded-4 shadow-lg bg-${type}`;
        
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    }
}
