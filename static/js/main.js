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
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14,
                            family: "'Inter', sans-serif"
                        }
                    }
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
            updateUI(data.proteins, data.carbs, data.veggies);
        })
        .catch(error => console.error('Error fetching stats:', error));
}

function addNutrient(type, amount) {
    fetch('/api/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: type,
            amount: amount
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Re-fetch stats to update UI and chart
            fetchTodayStats();
        } else {
            alert('紀錄失敗，請稍後再試');
        }
    })
    .catch(error => console.error('Error saving record:', error));
}

function updateUI(proteins, carbs, veggies) {
    // Update labels
    document.getElementById('val-proteins').innerText = proteins;
    document.getElementById('val-carbs').innerText = carbs;
    document.getElementById('val-veggies').innerText = veggies;

    // Update chart
    if (nutritionChart) {
        // If all are 0, we can show a placeholder or just leave it empty
        // To make the chart look nice even when empty, we could do something, 
        // but Chart.js handles [0,0,0] gracefully by drawing nothing.
        nutritionChart.data.datasets[0].data = [proteins, carbs, veggies];
        nutritionChart.update();
    }
}

function submitCustomFood() {
    const name = document.getElementById('customFoodName').value;
    const category = document.getElementById('customFoodCategory').value;
    const amount = parseFloat(document.getElementById('customFoodAmount').value);

    if (!name || !category || isNaN(amount) || amount <= 0) {
        alert('請完整填寫食物名稱、選擇類別，並輸入有效的份數！');
        return;
    }

    // Since we only track macronutrient totals, we just add the amount to the category.
    // The name is not saved to the DB in this version, but we show a success message.
    addNutrient(category, amount);

    // Close the modal
    const modalEl = document.getElementById('customFoodModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();

    // Reset the form
    document.getElementById('customFoodForm').reset();
    
    // Show a small alert or toast (optional, but alert is fine for now)
    // alert(`成功紀錄：${name} (${amount} 份)`);
}
