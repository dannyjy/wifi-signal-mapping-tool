/**
 * Interactive Floor Plan Canvas Engine for Wi-Fi Signal Mapping Tool
 */

class CanvasWorkspace {
  constructor(options) {
    this.container = document.getElementById(options.containerId);
    this.bgCanvas = document.getElementById(options.bgCanvasId);
    this.heatmapCanvas = document.getElementById(options.heatmapCanvasId);
    this.markerCanvas = document.getElementById(options.markerCanvasId);
    this.tooltip = document.getElementById(options.tooltipId);

    this.bgCtx = this.bgCanvas.getContext('2d');
    this.heatmapCtx = this.heatmapCanvas.getContext('2d');
    this.markerCtx = this.markerCanvas.getContext('2d');

    this.sessionId = options.sessionId;
    this.floorId = options.floorId;
    this.imageUrl = options.imageUrl;
    this.viewOnly = options.viewOnly === true;

    // Support injected getters for mobile/desktop dual controls
    this._getRSSI = options.getRSSI || (() => {
      const el = document.getElementById('rssiInputD') || document.getElementById('rssiInput');
      return el ? parseFloat(el.value) : -55;
    });
    this._getBand = options.getBand || (() => {
      const el = document.getElementById('bandSelectD') || document.getElementById('bandSelect');
      return el ? el.value : '2.4GHz';
    });

    this.currentMode = 'add_point';
    this.selectedBand = '2.4GHz';
    this.rssiInputValue = -55;
    this.heatmapVisible = true;
    this.heatmapOpacity = 0.65;
    this.gridStepSize = 8;

    this.points = options.initialPoints || [];
    this.aps = options.initialAPs || [];
    this.gridData = [];

    this.img = new Image();
    this.img.crossOrigin = 'anonymous';

    this.init();
  }

  init() {
    this.img.onload = () => {
      this.width = this.img.width || 800;
      this.height = this.img.height || 500;

      // Set internal dimensions
      [this.bgCanvas, this.heatmapCanvas, this.markerCanvas].forEach(canvas => {
        canvas.width = this.width;
        canvas.height = this.height;
      });

      this.container.style.width = `${this.width}px`;
      this.container.style.height = `${this.height}px`;

      this.renderBackground();
      this.recalculateAndRenderHeatmap();
      this.renderMarkers();
    };

    this.img.src = this.imageUrl;

    this.bindEvents();
  }

  renderBackground() {
    this.bgCtx.clearRect(0, 0, this.width, this.height);
    this.bgCtx.drawImage(this.img, 0, 0, this.width, this.height);
  }

  async recalculateAndRenderHeatmap() {
    if (!this.heatmapVisible || this.points.length === 0) {
      this.heatmapCtx.clearRect(0, 0, this.width, this.height);
      return;
    }

    // Compute IDW grid dynamically using IDWEngine
    this.gridData = IDWEngine.computeGrid(this.width, this.height, this.points, this.gridStepSize, 2.0);
    IDWEngine.renderGridToCanvas(this.heatmapCtx, this.width, this.height, this.gridData, this.gridStepSize, this.heatmapOpacity);
  }

  renderMarkers() {
    this.markerCtx.clearRect(0, 0, this.width, this.height);

    // Draw RSSI Sample Measurement Points
    for (const pt of this.points) {
      const classification = IDWEngine.classifySignal(pt.rssi_value);

      // Outer glow circle
      this.markerCtx.beginPath();
      this.markerCtx.arc(pt.x_coord, pt.y_coord, 9, 0, Math.PI * 2);
      this.markerCtx.fillStyle = `${classification.color}40`; // 25% opacity glow
      this.markerCtx.fill();

      // Main point marker
      this.markerCtx.beginPath();
      this.markerCtx.arc(pt.x_coord, pt.y_coord, 6, 0, Math.PI * 2);
      this.markerCtx.fillStyle = classification.color;
      this.markerCtx.fill();
      this.markerCtx.strokeStyle = '#FFFFFF';
      this.markerCtx.lineWidth = 1.5;
      this.markerCtx.stroke();
    }

    // Draw Access Points (APs) as Triangles
    for (const ap of this.aps) {
      this.markerCtx.beginPath();
      this.markerCtx.moveTo(ap.x_pos, ap.y_pos - 12);
      this.markerCtx.lineTo(ap.x_pos - 10, ap.y_pos + 8);
      this.markerCtx.lineTo(ap.x_pos + 10, ap.y_pos + 8);
      this.markerCtx.closePath();

      this.markerCtx.fillStyle = '#0F172A'; // Slate 900
      this.markerCtx.fill();
      this.markerCtx.strokeStyle = '#10B981'; // Emerald 500 border
      this.markerCtx.lineWidth = 2;
      this.markerCtx.stroke();

      // AP Label
      this.markerCtx.fillStyle = '#0F172A';
      this.markerCtx.font = 'bold 10px sans-serif';
      this.markerCtx.textAlign = 'center';
      this.markerCtx.fillText(ap.ssid, ap.x_pos, ap.y_pos - 15);
    }
  }

  bindEvents() {
    // Mouse events
    this.markerCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.markerCanvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.markerCanvas.addEventListener('mouseleave', () => this.hideTooltip());

    // Mobile Touch events
    this.markerCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        this.handleCanvasClick(touch);
      }
    }, { passive: false });

    this.markerCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        this.handleCanvasMouseMove(touch);
      }
    }, { passive: false });

    this.markerCanvas.addEventListener('touchend', () => {
      setTimeout(() => this.hideTooltip(), 2000);
    });
  }

  getCanvasCoords(e) {
    const rect = this.markerCanvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;

    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  }

  async handleCanvasClick(e) {
    if (this.viewOnly) return;

    const coords = this.getCanvasCoords(e);

    if (this.currentMode === 'add_point') {
      const rssi = this._getRSSI();
      const band = this._getBand();

      try {
        const resp = await fetch(`/api/surveys/${this.sessionId}/points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x_coord: coords.x,
            y_coord: coords.y,
            rssi_value: rssi,
            band: band
          })
        });

        const result = await resp.json();
        if (result.success) {
          this.points.push(result.data);
          this.recalculateAndRenderHeatmap();
          this.renderMarkers();
          this.updateMetricsUI(result.metrics);
        }
      } catch (err) {
        console.error('Failed to log point:', err);
      }
    } else if (this.currentMode === 'add_ap') {
      const ssid = prompt('Enter Access Point SSID:', 'UJUBA-WIFI-AP');
      if (!ssid) return;
      const channel = prompt('Enter Wi-Fi Channel (e.g. 1, 6, 11, 36):', '6');

      try {
        const resp = await fetch(`/api/floors/${this.floorId}/aps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ssid: ssid,
            x_pos: coords.x,
            y_pos: coords.y,
            channel: parseInt(channel || 6),
            tx_power_dbm: 20.0
          })
        });

        const result = await resp.json();
        if (result.success) {
          this.aps.push(result.data);
          this.renderMarkers();
        }
      } catch (err) {
        console.error('Failed to add AP:', err);
      }
    } else if (this.currentMode === 'select_delete') {
      // Check if user clicked on a point
      const clickedPointIdx = this.points.findIndex(pt => Math.hypot(pt.x_coord - coords.x, pt.y_coord - coords.y) < 12);
      if (clickedPointIdx !== -1) {
        const pt = this.points[clickedPointIdx];
        if (confirm(`Delete measurement point (${pt.rssi_value} dBm)?`)) {
          try {
            const resp = await fetch(`/api/points/${pt.point_id}`, { method: 'DELETE' });
            const result = await resp.json();
            if (result.success) {
              this.points.splice(clickedPointIdx, 1);
              this.recalculateAndRenderHeatmap();
              this.renderMarkers();
              this.updateMetricsUI(result.metrics);
            }
          } catch (err) {
            console.error('Failed to delete point:', err);
          }
        }
        return;
      }

      // Check if user clicked on an AP
      const clickedAPIdx = this.aps.findIndex(ap => Math.hypot(ap.x_pos - coords.x, ap.y_pos - coords.y) < 15);
      if (clickedAPIdx !== -1) {
        const ap = this.aps[clickedAPIdx];
        if (confirm(`Remove Access Point "${ap.ssid}"?`)) {
          try {
            const resp = await fetch(`/api/aps/${ap.ap_id}`, { method: 'DELETE' });
            const result = await resp.json();
            if (result.success) {
              this.aps.splice(clickedAPIdx, 1);
              this.renderMarkers();
            }
          } catch (err) {
            console.error('Failed to delete AP:', err);
          }
        }
      }
    }
  }

  handleCanvasMouseMove(e) {
    const coords = this.getCanvasCoords(e);
    let hoverContent = null;

    // Check AP hover
    const hoverAP = this.aps.find(ap => Math.hypot(ap.x_pos - coords.x, ap.y_pos - coords.y) < 15);
    if (hoverAP) {
      hoverContent = `<strong>[AP] ${hoverAP.ssid}</strong><br/>Channel: ${hoverAP.channel || 'Auto'}<br/>Tx Power: ${hoverAP.tx_power_dbm} dBm`;
    }

    // Check Point hover
    if (!hoverContent) {
      const hoverPt = this.points.find(pt => Math.hypot(pt.x_coord - coords.x, pt.y_coord - coords.y) < 10);
      if (hoverPt) {
        const classification = IDWEngine.classifySignal(hoverPt.rssi_value);
        hoverContent = `<strong>Signal: ${hoverPt.rssi_value} dBm</strong> (${classification.category})<br/>Band: ${hoverPt.band || '2.4GHz'}<br/>(X: ${hoverPt.x_coord}, Y: ${hoverPt.y_coord})`;
      }
    }

    if (hoverContent && this.tooltip) {
      this.tooltip.innerHTML = hoverContent;
      this.tooltip.style.display = 'block';

      const rect = this.container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      this.tooltip.style.left = `${clientX}px`;
      this.tooltip.style.top = `${clientY}px`;
    } else {
      this.hideTooltip();
    }
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  setMode(mode) {
    this.currentMode = mode;
  }

  toggleHeatmap(visible) {
    this.heatmapVisible = visible;
    this.heatmapCanvas.style.display = visible ? 'block' : 'none';
    if (visible) {
      this.recalculateAndRenderHeatmap();
    }
  }

  setOpacity(opacity) {
    this.heatmapOpacity = opacity;
    this.recalculateAndRenderHeatmap();
  }

  updateMetricsUI(metrics) {
    if (!metrics) return;
    const ptCountEl = document.getElementById('metricPointCount');
    const avgRSSIEl = document.getElementById('metricAvgRSSI');
    const deadZoneEl = document.getElementById('metricDeadZones');

    if (ptCountEl) ptCountEl.innerText = metrics.totalPoints;
    if (avgRSSIEl) avgRSSIEl.innerText = metrics.avgRSSI ? `${metrics.avgRSSI} dBm` : 'N/A';
    if (deadZoneEl) deadZoneEl.innerText = metrics.breakdown.poor;
  }
}
