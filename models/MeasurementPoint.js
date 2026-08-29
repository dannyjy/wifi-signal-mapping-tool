const db = require('../config/database');

class MeasurementPoint {
  static async getBySession(session_id) {
    return await db('measurement_points')
      .where({ session_id })
      .orderBy('point_id', 'asc');
  }

  static async findById(id) {
    return await db('measurement_points').where({ point_id: id }).first();
  }

  static async create({ session_id, x_coord, y_coord, rssi_value, band = '2.4GHz' }) {
    const [point_id] = await db('measurement_points').insert({
      session_id,
      x_coord: Math.round(x_coord),
      y_coord: Math.round(y_coord),
      rssi_value: parseFloat(rssi_value),
      band
    }, ['point_id']);

    const id = typeof point_id === 'object' ? point_id.point_id : point_id;
    return this.findById(id);
  }

  static async delete(id) {
    return await db('measurement_points').where({ point_id: id }).del();
  }
}

module.exports = MeasurementPoint;
