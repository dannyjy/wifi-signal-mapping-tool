const db = require('../config/database');

class Building {
  static async getAll() {
    const buildings = await db('buildings').select('*');
    for (const b of buildings) {
      const floors = await db('floors').where({ building_id: b.building_id });
      b.floors = floors;
      b.floor_count = floors.length;
    }
    return buildings;
  }

  static async findById(id) {
    const building = await db('buildings').where({ building_id: id }).first();
    if (building) {
      building.floors = await db('floors').where({ building_id: id }).orderBy('floor_number', 'asc');
    }
    return building;
  }

  static async create({ name, code, location, total_floors = 1 }) {
    const [building_id] = await db('buildings').insert({
      name,
      code,
      location,
      total_floors
    }, ['building_id']);

    const id = typeof building_id === 'object' ? building_id.building_id : building_id;
    return this.findById(id);
  }

  static async delete(id) {
    return await db('buildings').where({ building_id: id }).del();
  }
}

module.exports = Building;
