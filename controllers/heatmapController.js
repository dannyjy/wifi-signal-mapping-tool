const MeasurementPoint = require('../models/MeasurementPoint');
const HeatmapCache = require('../models/HeatmapCache');
const { computeIDWGrid } = require('../utils/idwCalculator');

module.exports = {
  interpolate: async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const width = parseInt(req.query.width || req.body.width || 800);
      const height = parseInt(req.query.height || req.body.height || 500);
      const stepSize = parseInt(req.query.stepSize || req.body.stepSize || 8);
      const p = parseFloat(req.query.p || req.body.p || 2.0);

      // Check Heatmap Cache
      const cached = await HeatmapCache.getBySession(sessionId);
      if (cached && cached.grid_matrix_json) {
        const gridMatrix = JSON.parse(cached.grid_matrix_json);
        if (gridMatrix.width === width && gridMatrix.height === height && gridMatrix.stepSize === stepSize) {
          return res.json({
            success: true,
            cached: true,
            data: gridMatrix.grid
          });
        }
      }

      // Fetch Sample Measurement Points
      const samplePoints = await MeasurementPoint.getBySession(sessionId);
      if (!samplePoints || samplePoints.length === 0) {
        return res.json({
          success: true,
          cached: false,
          data: [],
          message: 'No measurement points found for this session'
        });
      }

      // Execute IDW Spatial Interpolation Engine
      const grid = computeIDWGrid(width, height, samplePoints, stepSize, p);

      // Save to Heatmap Cache
      await HeatmapCache.set(sessionId, { width, height, stepSize, p, grid });

      res.json({
        success: true,
        cached: false,
        data: grid
      });
    } catch (err) {
      console.error('Heatmap interpolation error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};
