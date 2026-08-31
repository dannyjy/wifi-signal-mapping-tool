/**
 * Inverse Distance Weighting (IDW) Spatial Interpolation & RSSI Classifier
 * Formula: Z(u) = sum( Z_i / d(u, u_i)^p ) / sum( 1 / d(u, u_i)^p )
 * Power exponent p = 2.0
 */

function classifySignal(rssi) {
  const r = parseFloat(rssi);
  if (r >= -50) return { category: 'Excellent', color: '#10B981', label: 'Strong', classKey: 'excellent' };
  if (r >= -60) return { category: 'Good', color: '#3B82F6', label: 'Healthy', classKey: 'good' };
  if (r >= -70) return { category: 'Acceptable', color: '#F59E0B', label: 'Fair', classKey: 'acceptable' };
  return { category: 'Poor', color: '#EF4444', label: 'Dead Zone', classKey: 'poor' };
}

function computeIDWGrid(width, height, samplePoints, stepSize = 8, p = 2.0) {
  if (!samplePoints || samplePoints.length === 0) {
    return [];
  }

  const grid = [];
  for (let x = 0; x < width; x += stepSize) {
    for (let y = 0; y < height; y += stepSize) {
      let weightSum = 0;
      let valueSum = 0;
      let exactMatch = null;

      for (const pt of samplePoints) {
        const px = pt.x_coord !== undefined ? pt.x_coord : pt.x;
        const py = pt.y_coord !== undefined ? pt.y_coord : pt.y;
        const rssi = pt.rssi_value !== undefined ? pt.rssi_value : pt.rssi;

        const dist = Math.hypot(x - px, y - py);
        if (dist === 0) {
          exactMatch = rssi;
          break;
        }
        const w = 1 / Math.pow(dist, p);
        weightSum += w;
        valueSum += w * rssi;
      }

      const interpolatedRSSI = exactMatch !== null ? exactMatch : (valueSum / weightSum);
      const classification = classifySignal(interpolatedRSSI);

      grid.push({
        x,
        y,
        rssi: Math.round(interpolatedRSSI * 10) / 10,
        category: classification.category,
        color: classification.color
      });
    }
  }

  return grid;
}

/**
 * Calculates overall metrics for a list of measurement points
 */
function calculateMetrics(samplePoints) {
  if (!samplePoints || samplePoints.length === 0) {
    return {
      totalPoints: 0,
      avgRSSI: null,
      minRSSI: null,
      maxRSSI: null,
      breakdown: { excellent: 0, good: 0, acceptable: 0, poor: 0 },
      percentages: { excellent: 0, good: 0, acceptable: 0, poor: 0 }
    };
  }

  let totalRSSI = 0;
  let minRSSI = Infinity;
  let maxRSSI = -Infinity;
  const breakdown = { excellent: 0, good: 0, acceptable: 0, poor: 0 };

  for (const pt of samplePoints) {
    const rssi = parseFloat(pt.rssi_value !== undefined ? pt.rssi_value : pt.rssi);
    totalRSSI += rssi;
    if (rssi < minRSSI) minRSSI = rssi;
    if (rssi > maxRSSI) maxRSSI = rssi;

    const classified = classifySignal(rssi);
    breakdown[classified.classKey]++;
  }

  const totalPoints = samplePoints.length;
  const percentages = {
    excellent: Math.round((breakdown.excellent / totalPoints) * 100),
    good: Math.round((breakdown.good / totalPoints) * 100),
    acceptable: Math.round((breakdown.acceptable / totalPoints) * 100),
    poor: Math.round((breakdown.poor / totalPoints) * 100)
  };

  return {
    totalPoints,
    avgRSSI: (totalRSSI / totalPoints).toFixed(1),
    minRSSI: minRSSI.toFixed(1),
    maxRSSI: maxRSSI.toFixed(1),
    breakdown,
    percentages
  };
}

module.exports = {
  classifySignal,
  computeIDWGrid,
  calculateMetrics
};
