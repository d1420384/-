let nutritionChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on dashboard by checking for canvas
    if (document.getElementById('nutritionChart')) {
        initChart();
        fetchTodayStats();
    }
});

function updateQty(type, amount) {
    const el = document.getElementById(`${type}-qty`);
    if (el) {
        let current = parseInt(el.innerText);
        let newQty = current + amount;
        if (newQty < 0) newQty = 0;
        el.innerText = newQty;
        
        // Add a small animation effect
        el.style.transform = 'scale(1.5)';
        el.style.color = 'var(--primary-color)';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
            el.style.color = '';
        }, 150);
    }
}

async function submitManualRecord() {
    const protein = parseInt(document.getElementById('protein-qty').innerText);
    const carb = parseInt(document.getElementById('carb-qty').innerText);
    const veg = parseInt(document.getElementById('veg-qty').innerText);
    
    if (protein === 0 && carb === 0 && veg === 0) {
        alert('請至少輸入一份營養素喔！');
        return;
    }
    
    await sendRecord({ protein, carb, veg, food_name: '' });
    
    // Reset manual inputs
    document.getElementById('protein-qty').innerText = '0';
    document.getElementById('carb-qty').innerText = '0';
    document.getElementById('veg-qty').innerText = '0';
}

async function addPrototypeFood(foodName, protein, carb, veg) {
    await sendRecord({ protein, carb, veg, food_name: foodName });
}

async function sendRecord(data) {
    try {
        const response = await fetch('/api/record', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.status === 'success') {
            showToast();
            fetchTodayStats();
        } else {
            alert(result.message || '紀錄失敗');
        }
    } catch (error) {
        console.error('Error saving record:', error);
        alert('系統發生錯誤，請稍後再試。');
    }
}

function showToast() {
    const toastEl = document.getElementById('liveToast');
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

async function fetchTodayStats() {
    try {
        const response = await fetch('/api/today');
        const result = await response.json();
        
        if (result.status === 'success') {
            const data = result.data;
            
            // Animate numbers
            animateValue('total-protein', 0, data.protein, 500);
            animateValue('total-carb', 0, data.carb, 500);
            animateValue('total-veg', 0, data.veg, 500);
            
            updateChart(data.protein, data.carb, data.veg);
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

function initChart() {
    const ctx = document.getElementById('nutritionChart').getContext('2d');
    
    Chart.defaults.color = 'rgba(255, 255, 255, 0.8)';
    Chart.defaults.font.family = "'Noto Sans TC', sans-serif";
    
    nutritionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['蛋白質', '澱粉', '蔬果'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#c38e8e', // Morandi Rose for Protein
                    '#d4b290', // Morandi warm beige for Carb
                    '#9ca998'  // Morandi Sage Green for Veg
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#2b2d42',
                    bodyColor: '#2b2d42',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.isPlaceholder) {
                                return ' 今日尚未記錄飲食';
                            }
                            return ` ${context.label}: ${context.raw} 份`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
            }
        },
        plugins: [{
            id: 'centerText',
            afterDraw: function(chart) {
                const { ctx, width, height } = chart;
                ctx.save();
                
                let total = 0;
                const dataset = chart.data.datasets[0];
                if (dataset && !dataset.isPlaceholder) {
                    total = dataset.data.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
                }
                
                // Draw title text
                ctx.font = "bold 13px 'Noto Sans TC', sans-serif";
                ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("今日已攝取", width / 2, height / 2 - 14);
                
                // Draw value
                ctx.font = "800 28px 'Noto Sans TC', sans-serif";
                ctx.fillStyle = "#ffffff";
                ctx.fillText(total.toFixed(1) + " 份", width / 2, height / 2 + 16);
                
                ctx.restore();
            }
        }]
    });
}

function updateProgressBar(id, current, target) {
    const pct = Math.min(Math.round((current / target) * 100), 100);
    const textEl = document.getElementById(`progress-text-${id}`);
    const barEl = document.getElementById(`progress-bar-${id}`);
    if (textEl) {
        textEl.innerText = `${current.toFixed(1)} / ${target.toFixed(1)} 份 (${pct}%)`;
    }
    if (barEl) {
        barEl.style.width = `${pct}%`;
    }
}

function updateChart(protein, carb, veg) {
    // Update target progress bars
    const targets = {
        protein: 3.0,
        carb: 2.0,
        veg: 5.0
    };
    
    updateProgressBar('protein', protein, targets.protein);
    updateProgressBar('carb', carb, targets.carb);
    updateProgressBar('veg', veg, targets.veg);

    if (nutritionChart) {
        if (protein === 0 && carb === 0 && veg === 0) {
            // Show a white-translucent placeholder if no data yet (on Morandi primary color background card)
            nutritionChart.data.datasets[0].data = [1];
            nutritionChart.data.datasets[0].backgroundColor = ['rgba(255, 255, 255, 0.25)'];
            nutritionChart.data.datasets[0].isPlaceholder = true;
            nutritionChart.data.labels = ['尚未紀錄'];
        } else {
            nutritionChart.data.datasets[0].data = [protein, carb, veg];
            nutritionChart.data.datasets[0].backgroundColor = ['#c38e8e', '#d4b290', '#9ca998'];
            nutritionChart.data.datasets[0].isPlaceholder = false;
            nutritionChart.data.labels = ['蛋白質', '澱粉', '蔬果'];
        }
        nutritionChart.update();
    }
}

// Helper to animate numbers rolling up
function animateValue(id, start, end, duration) {
    if (start === end) {
        document.getElementById(id).innerHTML = end;
        return;
    }
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}
