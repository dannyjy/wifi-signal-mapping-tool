const db = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  console.log('Initializing database tables...');

  // Create Users Table
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.increments('user_id').primary();
      t.string('username', 50).notNullable().unique();
      t.string('email', 100).notNullable().unique();
      t.string('password_hash', 255).notNullable();
      t.string('role', 20).defaultTo('Surveyor');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // Create Buildings Table
  const hasBuildings = await db.schema.hasTable('buildings');
  if (!hasBuildings) {
    await db.schema.createTable('buildings', (t) => {
      t.increments('building_id').primary();
      t.string('name', 100).notNullable();
      t.string('code', 20).notNullable().unique();
      t.string('location', 150);
      t.integer('total_floors').defaultTo(1);
    });
  }

  // Create Floors Table
  const hasFloors = await db.schema.hasTable('floors');
  if (!hasFloors) {
    await db.schema.createTable('floors', (t) => {
      t.increments('floor_id').primary();
      t.integer('building_id').unsigned().notNullable()
        .references('building_id').inTable('buildings').onDelete('CASCADE');
      t.integer('floor_number').notNullable();
      t.string('image_path', 255).notNullable();
      t.float('scale_factor').defaultTo(1.0);
    });
  }

  // Create Survey Sessions Table
  const hasSessions = await db.schema.hasTable('survey_sessions');
  if (!hasSessions) {
    await db.schema.createTable('survey_sessions', (t) => {
      t.increments('session_id').primary();
      t.integer('floor_id').unsigned().notNullable()
        .references('floor_id').inTable('floors').onDelete('CASCADE');
      t.integer('user_id').unsigned().references('user_id').inTable('users').onDelete('SET NULL');
      t.string('session_name', 100).notNullable();
      t.string('status', 20).defaultTo('Draft');
      t.timestamp('survey_date').defaultTo(db.fn.now());
      t.text('notes');
    });
  }

  // Create Measurement Points Table
  const hasPoints = await db.schema.hasTable('measurement_points');
  if (!hasPoints) {
    await db.schema.createTable('measurement_points', (t) => {
      t.increments('point_id').primary();
      t.integer('session_id').unsigned().notNullable()
        .references('session_id').inTable('survey_sessions').onDelete('CASCADE');
      t.integer('x_coord').notNullable();
      t.integer('y_coord').notNullable();
      t.float('rssi_value').notNullable();
      t.string('band', 10).defaultTo('2.4GHz');
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // Create Access Points Table
  const hasAPs = await db.schema.hasTable('access_points');
  if (!hasAPs) {
    await db.schema.createTable('access_points', (t) => {
      t.increments('ap_id').primary();
      t.integer('floor_id').unsigned().notNullable()
        .references('floor_id').inTable('floors').onDelete('CASCADE');
      t.string('ssid', 100).notNullable();
      t.string('mac_address', 50);
      t.integer('x_pos').notNullable();
      t.integer('y_pos').notNullable();
      t.float('tx_power_dbm').defaultTo(20.0);
      t.integer('channel');
    });
  }

  // Create Heatmap Cache Table
  const hasCache = await db.schema.hasTable('heatmap_cache');
  if (!hasCache) {
    await db.schema.createTable('heatmap_cache', (t) => {
      t.increments('cache_id').primary();
      t.integer('session_id').unsigned().notNullable()
        .references('session_id').inTable('survey_sessions').onDelete('CASCADE');
      t.text('grid_matrix_json').notNullable();
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  console.log('Database tables ready.');

  // Seed Users
  const userCount = await db('users').count('* as count').first();
  if (parseInt(userCount.count || 0) === 0) {
    console.log('Seeding users...');
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedSurveyorPassword = await bcrypt.hash('surveyor123', 10);

    await db('users').insert([
      {
        username: 'admin',
        email: 'admin@ujuba.edu.ss',
        password_hash: hashedAdminPassword,
        role: 'Admin'
      },
      {
        username: 'surveyor1',
        email: 'surveyor@ujuba.edu.ss',
        password_hash: hashedSurveyorPassword,
        role: 'Surveyor'
      },
      {
        username: 'viewer1',
        email: 'viewer@ujuba.edu.ss',
        password_hash: await bcrypt.hash('viewer123', 10),
        role: 'Viewer'
      }
    ]);
  }

  // Seed Buildings & Floors
  const bldgCount = await db('buildings').count('* as count').first();
  if (parseInt(bldgCount.count || 0) === 0) {
    console.log('Seeding campus buildings & floor plans for University of Juba...');

    const [bldg1] = await db('buildings').insert({
      name: 'College of Natural Resources & Environmental Studies',
      code: 'CNRES-01',
      location: 'Main Campus, Sector A',
      total_floors: 2
    }, ['building_id']);

    const [bldg2] = await db('buildings').insert({
      name: 'Computer Center & ICT Hub',
      code: 'ICT-02',
      location: 'Central Campus Quad',
      total_floors: 3
    }, ['building_id']);

    const building1Id = typeof bldg1 === 'object' ? bldg1.building_id : bldg1;
    const building2Id = typeof bldg2 === 'object' ? bldg2.building_id : bldg2;

    const [flr1] = await db('floors').insert({
      building_id: building1Id,
      floor_number: 1,
      image_path: '/uploads/floor_plan_science_f1.svg',
      scale_factor: 15.0
    }, ['floor_id']);

    const [flr2] = await db('floors').insert({
      building_id: building1Id,
      floor_number: 2,
      image_path: '/uploads/floor_plan_science_f2.svg',
      scale_factor: 15.0
    }, ['floor_id']);

    const floor1Id = typeof flr1 === 'object' ? flr1.floor_id : flr1;
    const floor2Id = typeof flr2 === 'object' ? flr2.floor_id : flr2;

    // Seed Access Points for Floor 2
    await db('access_points').insert([
      {
        floor_id: floor2Id,
        ssid: 'UJUBA-CAMPUS-WIFI',
        mac_address: '74:83:C2:11:4A:01',
        x_pos: 180,
        y_pos: 150,
        tx_power_dbm: 23.0,
        channel: 6
      },
      {
        floor_id: floor2Id,
        ssid: 'UJUBA-FACULTY-5G',
        mac_address: '74:83:C2:11:4A:02',
        x_pos: 550,
        y_pos: 280,
        tx_power_dbm: 20.0,
        channel: 36
      }
    ]);

    // Seed Survey Session
    const [session] = await db('survey_sessions').insert({
      floor_id: floor2Id,
      user_id: 1,
      session_name: 'Science Dept Floor 2 Wi-Fi Signal Audit',
      status: 'Completed',
      notes: 'Audited during peak student lecture hours. Low signal detected in West Lecture Hall B.'
    }, ['session_id']);

    const sessionId = typeof session === 'object' ? session.session_id : session;

    // Seed RSSI Measurement Points
    const pointsData = [
      // Near AP 1 (Strong RSSI)
      { session_id: sessionId, x_coord: 150, y_coord: 140, rssi_value: -42.0, band: '2.4GHz' },
      { session_id: sessionId, x_coord: 200, y_coord: 160, rssi_value: -48.0, band: '2.4GHz' },
      { session_id: sessionId, x_coord: 220, y_coord: 120, rssi_value: -53.0, band: '2.4GHz' },
      // Mid range
      { session_id: sessionId, x_coord: 320, y_coord: 200, rssi_value: -62.0, band: '2.4GHz' },
      { session_id: sessionId, x_coord: 380, y_coord: 220, rssi_value: -67.0, band: '2.4GHz' },
      // Near AP 2
      { session_id: sessionId, x_coord: 530, y_coord: 270, rssi_value: -45.0, band: '5GHz' },
      { session_id: sessionId, x_coord: 580, y_coord: 300, rssi_value: -49.0, band: '5GHz' },
      // Weak Areas / Dead zones (West Wing)
      { session_id: sessionId, x_coord: 60, y_coord: 350, rssi_value: -78.0, band: '2.4GHz' },
      { session_id: sessionId, x_coord: 80, y_coord: 400, rssi_value: -84.0, band: '2.4GHz' },
      { session_id: sessionId, x_coord: 120, y_coord: 420, rssi_value: -76.0, band: '2.4GHz' },
      // South corridor
      { session_id: sessionId, x_coord: 450, y_coord: 420, rssi_value: -72.0, band: '2.4GHz' },
      { session_id: sessionId, x_coord: 650, y_coord: 420, rssi_value: -81.0, band: '5GHz' }
    ];

    await db('measurement_points').insert(pointsData);
  }

  console.log('Database seeding complete!');
}

if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
