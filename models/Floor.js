const db = require('../config/database');

class Floor {
  static async findById(id) {
    const floor = await db('floors').where({ floor_id: id }).first();
    if (floor) {
      floor.building = await db('buildings').where({ building_id: floor.building_id }).first();
      floor.aps = await db('access_points').where({ floor_id: id });
    }
    return floor;
  }

  static async findByBuilding(building_id) {
    return await db('floors').where({ building_id }).orderBy('floor_number', 'asc');
  }

  static async create({ building_id, floor_number, image_path, scale_factor = 1.0 }) {
    const [floor_id] = await db('floors').insert({
      building_id,
      floor_number,
      image_path,
      scale_factor
    }, ['floor_id']);

    const id = typeof floor_id === 'object' ? floor_id.floor_id : floor_id;
    return this.findById(id);
  }

  static async delete(id) {
    return await db('floors').where({ floor_id: id }).del();
  }
}

module.exports = Floor;
