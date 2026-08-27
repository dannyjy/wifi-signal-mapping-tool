-- MySQL 8.0+ Database Schema for Wi-Fi Signal Strength Mapping Tool
-- Case Study: University of Juba

CREATE DATABASE IF NOT EXISTS wifi_mapping_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wifi_mapping_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Surveyor', 'Viewer') DEFAULT 'Surveyor',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
  building_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  location VARCHAR(150),
  total_floors INT DEFAULT 1
) ENGINE=InnoDB;

-- 3. Floors Table
CREATE TABLE IF NOT EXISTS floors (
  floor_id INT AUTO_INCREMENT PRIMARY KEY,
  building_id INT NOT NULL,
  floor_number INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  scale_factor FLOAT DEFAULT 1.0,
  FOREIGN KEY (building_id) REFERENCES buildings(building_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Survey Sessions Table
CREATE TABLE IF NOT EXISTS survey_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  floor_id INT NOT NULL,
  user_id INT,
  session_name VARCHAR(100) NOT NULL,
  status ENUM('Draft', 'Completed', 'Archived') DEFAULT 'Draft',
  survey_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (floor_id) REFERENCES floors(floor_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Measurement Points Table
CREATE TABLE IF NOT EXISTS measurement_points (
  point_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  x_coord INT NOT NULL,
  y_coord INT NOT NULL,
  rssi_value FLOAT NOT NULL,
  band VARCHAR(10) DEFAULT '2.4GHz',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES survey_sessions(session_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Access Points Table
CREATE TABLE IF NOT EXISTS access_points (
  ap_id INT AUTO_INCREMENT PRIMARY KEY,
  floor_id INT NOT NULL,
  ssid VARCHAR(100) NOT NULL,
  mac_address VARCHAR(50),
  x_pos INT NOT NULL,
  y_pos INT NOT NULL,
  tx_power_dbm FLOAT DEFAULT 20.0,
  channel INT,
  FOREIGN KEY (floor_id) REFERENCES floors(floor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Heatmap Cache Table
CREATE TABLE IF NOT EXISTS heatmap_cache (
  cache_id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  grid_matrix_json LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES survey_sessions(session_id) ON DELETE CASCADE
) ENGINE=InnoDB;
