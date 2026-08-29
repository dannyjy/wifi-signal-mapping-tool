const db = require('../config/database');

class AccessPoint {
  static async getByFloor(floor_id) {
    return await db('access_points')
      .where({ floor_id })
      .orderBy('ap_id', 'asc');
  }

  static async findById(id) {
    return await db('access_points').where({ ap_id: id }).first();
  }

  static async create({ floor_id, ssid, mac_address, x_pos, y_pos, tx_power_dbm = 20.0, channel = 6 }) {
    const [ap_id] = await db('access_points').insert({
      floor_id,
      ssid,
      mac_address,
      x_pos: Math.round(x_pos),
      y_pos: Math.round(y_pos),
      tx_power_dbm: parseFloat(tx_power_dbm),
      channel: parseInt(channel)
    }, ['ap_id']);

    const id = typeof ap_id === 'object' ? ap_id.ap_id : ap_id;
    return this.findById(id);
  }

  static async delete(id) {
    return await db('access_points').where({ ap_id: id }).del();
  }
}

module.exports = AccessPoint;
