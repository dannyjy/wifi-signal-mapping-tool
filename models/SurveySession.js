const db = require('../config/database');

class SurveySession {
  static async getAll() {
    const sessions = await db('survey_sessions as s')
      .join('floors as f', 's.floor_id', 'f.floor_id')
      .join('buildings as b', 'f.building_id', 'b.building_id')
      .leftJoin('users as u', 's.user_id', 'u.user_id')
      .select(
        's.*',
        'f.floor_number',
        'f.image_path',
        'b.name as building_name',
        'b.code as building_code',
        'u.username as surveyor_name'
      )
      .orderBy('s.survey_date', 'desc');

    for (const session of sessions) {
      const pointStats = await db('measurement_points')
        .where({ session_id: session.session_id })
        .count('* as count')
        .avg('rssi_value as avg_rssi')
        .first();
      
      session.point_count = parseInt(pointStats.count || 0);
      session.avg_rssi = pointStats.avg_rssi ? parseFloat(pointStats.avg_rssi).toFixed(1) : null;
    }

    return sessions;
  }

  static async findById(id) {
    const session = await db('survey_sessions as s')
      .join('floors as f', 's.floor_id', 'f.floor_id')
      .join('buildings as b', 'f.building_id', 'b.building_id')
      .leftJoin('users as u', 's.user_id', 'u.user_id')
      .select(
        's.*',
        'f.floor_number',
        'f.image_path',
        'f.scale_factor',
        'b.building_id',
        'b.name as building_name',
        'b.code as building_code',
        'b.location as building_location',
        'u.username as surveyor_name'
      )
      .where('s.session_id', id)
      .first();

    if (session) {
      session.points = await db('measurement_points').where({ session_id: id }).orderBy('point_id', 'asc');
      session.aps = await db('access_points').where({ floor_id: session.floor_id }).orderBy('ap_id', 'asc');
    }

    return session;
  }

  static async create({ floor_id, user_id, session_name, notes, status = 'Draft' }) {
    const [session_id] = await db('survey_sessions').insert({
      floor_id,
      user_id,
      session_name,
      notes,
      status
    }, ['session_id']);

    const id = typeof session_id === 'object' ? session_id.session_id : session_id;
    return this.findById(id);
  }

  static async updateStatus(id, status) {
    await db('survey_sessions').where({ session_id: id }).update({ status });
    return this.findById(id);
  }

  static async delete(id) {
    return await db('survey_sessions').where({ session_id: id }).del();
  }
}

module.exports = SurveySession;
