/**
 * Chart.js Integration for Dashboard Summary Analytics
 */

function initDashboardCharts(data) {
  const signalCtx = document.getElementById('signalDistributionChart');
  if (!signalCtx || !window.Chart) return;

  new Chart(signalCtx, {
    type: 'doughnut',
    data: {
      labels: ['Excellent (≥ -50dBm)', 'Good (-50 to -60)', 'Acceptable (-60 to -70)', 'Poor / Dead Zone (< -70)'],
      datasets: [{
        data: [
          data.excellent || 0,
          data.good || 0,
          data.acceptable || 0,
          data.poor || 0
        ],
        backgroundColor: [
          '#10B981', // Emerald 500
          '#3B82F6', // Blue 500
          '#F59E0B', // Amber 500
          '#EF4444'  // Red 500
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Inter', size: 12 },
            padding: 15,
            usePointStyle: true
          }
        }
      },
      cutout: '70%'
    }
  });
}
