/**
 * Client-Side IDW Interpolation Engine
 * Calculates Spatial Heatmap Matrices dynamically on HTML5 Canvas
 */

const IDWEngine = {
  classifySignal(rssi) {
    const r = parseFloat(rssi);
    if (r >= -50) return { category: 'Excellent', color: '#10B981', rgba: [16, 185, 129] };
    if (r >= -60) return { category: 'Good', color: '#3B82F6', rgba: [59, 130, 246] };
    if (r >= -70) return { category: 'Acceptable', color: '#F59E0B', rgba: [245, 158, 11] };
    return { category: 'Poor', color: '#EF4444', rgba: [239, 68, 68] };
  },

  // Map RSSI value (-30 dBm to -90 dBm) to RGB color
  rssiToRGB(rssi) {
    const minRSSI = -90;
    const maxRSSI = -30;
    let norm = (rssi - minRSSI) / (maxRSSI - minRSSI);
    norm = Math.max(0, Math.min(1, norm));

    // Green (0.8 - 1.0), Blue (0.5 - 0.8), Yellow/Amber (0.2 - 0.5), Red (0.0 - 0.2)
    let r, g, b;

    if (norm > 0.66) {
      // Emerald to Blue
      const t = (norm - 0.66) / 0.34;
      r = Math.round(16 * (1 - t) + 16 * t);
      g = Math.round(185 * (1 - t) + 185 * t);
      b = Math.round(129 * (1 - t) + 246 * t);
    } else if (norm > 0.33) {
      // Blue to Amber
      const t = (norm - 0.33) / 0.33;
      r = Math.round(245 * (1 - t) + 59 * t);
      g = Math.round(158 * (1 - t) + 130 * t);
      b = Math.round(11 * (1 - t) + 246 * t);
    } else {
      // Amber to Red
      const t = norm / 0.33;
      r = Math.round(239 * (1 - t) + 245 * t);
      g = Math.round(68 * (1 - t) + 158 * t);
      b = Math.round(68 * (1 - t) + 11 * t);
    }

    return [r, g, b];
  },

  computeGrid(width, height, points, stepSize = 8, p = 2.0) {
    if (!points || points.length === 0) return [];

    const grid = [];
    for (let x = 0; x < width; x += stepSize) {
      for (let y = 0; y < height; y += stepSize) {
        let weightSum = 0;
        let valueSum = 0;
        let exactMatch = null;

        for (const pt of points) {
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
        const rgb = this.rssiToRGB(interpolatedRSSI);

        grid.push({
          x,
          y,
          rssi: interpolatedRSSI,
          rgb
        });
      }
    }

    return grid;
  },

  renderGridToCanvas(canvasCtx, width, height, grid, stepSize = 8, opacity = 0.65) {
    canvasCtx.clearRect(0, 0, width, height);
    if (!grid || grid.length === 0) return;

    for (const cell of grid) {
      canvasCtx.fillStyle = `rgba(${cell.rgb[0]}, ${cell.rgb[1]}, ${cell.rgb[2]}, ${opacity})`;
      canvasCtx.fillRect(cell.x, cell.y, stepSize, stepSize);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IDWEngine;
}
