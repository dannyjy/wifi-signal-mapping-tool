const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async findById(id) {
    return await db('users').where({ user_id: id }).first();
  }

  static async findByUsername(username) {
    return await db('users').where({ username }).first();
  }

  static async findByEmail(email) {
    return await db('users').where({ email }).first();
  }

  static async create({ username, email, password, role = 'Surveyor' }) {
    const password_hash = await bcrypt.hash(password, 10);
    const [user_id] = await db('users').insert({
      username,
      email,
      password_hash,
      role
    }, ['user_id']);
    
    const id = typeof user_id === 'object' ? user_id.user_id : user_id;
    return this.findById(id);
  }

  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  static async getAll() {
    return await db('users').select('user_id', 'username', 'email', 'role', 'created_at');
  }

  static async updateRole(id, role) {
    return await db('users').where({ user_id: id }).update({ role });
  }

  static async delete(id) {
    return await db('users').where({ user_id: id }).del();
  }
}

module.exports = User;
