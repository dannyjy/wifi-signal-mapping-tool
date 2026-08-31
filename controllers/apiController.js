const MeasurementPoint = require('../models/MeasurementPoint');
const AccessPoint = require('../models/AccessPoint');
const HeatmapCache = require('../models/HeatmapCache');
const { classifySignal, calculateMetrics } = require('../utils/idwCalculator');

module.exports = {
  getPoints: async (req, res) => {
    try {
      const points = await MeasurementPoint.getBySession(req.params.sessionId);
      const formatted = points.map(pt => ({
        ...pt,
        classification: classifySignal(pt.rssi_value)
      }));
      res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('API getPoints error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  addPoint: async (req, res) => {
    try {
      const { x_coord, y_coord, rssi_value, band } = req.body;
      const sessionId = req.params.sessionId;

      if (x_coord === undefined || y_coord === undefined || rssi_value === undefined) {
        return res.status(400).json({ success: false, message: 'Missing x_coord, y_coord, or rssi_value' });
      }

      const point = await MeasurementPoint.create({
        session_id: sessionId,
        x_coord,
        y_coord,
        rssi_value,
        band: band || '2.4GHz'
      });

      // Clear heatmap cache as sample points changed
      await HeatmapCache.delete(sessionId);

      const classification = classifySignal(point.rssi_value);
      const allPoints = await MeasurementPoint.getBySession(sessionId);
      const metrics = calculateMetrics(allPoints);

      res.status(201).json({
        success: true,
        data: {
          ...point,
          classification
        },
        metrics
      });
    } catch (err) {
      console.error('API addPoint error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deletePoint: async (req, res) => {
    try {
      const point = await MeasurementPoint.findById(req.params.pointId);
      if (!point) {
        return res.status(404).json({ success: false, message: 'Point not found' });
      }

      const sessionId = point.session_id;
      await MeasurementPoint.delete(req.params.pointId);
      await HeatmapCache.delete(sessionId);

      const allPoints = await MeasurementPoint.getBySession(sessionId);
      const metrics = calculateMetrics(allPoints);

      res.json({ success: true, message: 'Point deleted', metrics });
    } catch (err) {
      console.error('API deletePoint error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getAPs: async (req, res) => {
    try {
      const aps = await AccessPoint.getByFloor(req.params.floorId);
      res.json({ success: true, data: aps });
    } catch (err) {
      console.error('API getAPs error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  addAP: async (req, res) => {
    try {
      const { ssid, mac_address, x_pos, y_pos, tx_power_dbm, channel } = req.body;
      const floorId = req.params.floorId;

      if (!ssid || x_pos === undefined || y_pos === undefined) {
        return res.status(400).json({ success: false, message: 'Missing ssid, x_pos, or y_pos' });
      }

      const ap = await AccessPoint.create({
        floor_id: floorId,
        ssid,
        mac_address,
        x_pos,
        y_pos,
        tx_power_dbm: tx_power_dbm || 20.0,
        channel: channel || 6
      });

      res.status(201).json({ success: true, data: ap });
    } catch (err) {
      console.error('API addAP error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  deleteAP: async (req, res) => {
    try {
      await AccessPoint.delete(req.params.apId);
      res.json({ success: true, message: 'Access Point removed' });
    } catch (err) {
      console.error('API deleteAP error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};
