const db = require('../config/database');

class HeatmapCache {
  static async getBySession(session_id) {
    return await db('heatmap_cache').where({ session_id }).first();
  }

  static async set(session_id, gridMatrixData) {
    const existing = await this.getBySession(session_id);
    const grid_matrix_json = typeof gridMatrixData === 'string' ? gridMatrixData : JSON.stringify(gridMatrixData);

    if (existing) {
      await db('heatmap_cache')
        .where({ session_id })
        .update({ grid_matrix_json, updated_at: db.fn.now() });
      return await this.getBySession(session_id);
    } else {
      const [cache_id] = await db('heatmap_cache').insert({
        session_id,
        grid_matrix_json
      }, ['cache_id']);
      const id = typeof cache_id === 'object' ? cache_id.cache_id : cache_id;
      return await db('heatmap_cache').where({ cache_id: id }).first();
    }
  }

  static async delete(session_id) {
    return await db('heatmap_cache').where({ session_id }).del();
  }
}

module.exports = HeatmapCache;
