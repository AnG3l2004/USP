CREATE DATABASE IF NOT EXISTS alertix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alertix;

-- Users (admins are inserted manually/seeded)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  region ENUM('Sofia','Varna','Plovdiv','Burgas') NOT NULL DEFAULT 'Sofia',
  role ENUM('user','operator','admin') NOT NULL DEFAULT 'user',
  status ENUM('active','blocked') NOT NULL DEFAULT 'active',
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Disasters / events
CREATE TABLE IF NOT EXISTS disasters (
  id VARCHAR(32) PRIMARY KEY,
  type ENUM('earthquake','flood','fire','storm','other') NOT NULL,
  time DATETIME NOT NULL,
  place VARCHAR(190) NOT NULL,
  region ENUM('Sofia','Varna','Plovdiv','Burgas') NOT NULL,
  damage VARCHAR(120) NULL,
  duration VARCHAR(80) NULL,
  level ENUM('low','medium','high','critical') NOT NULL,
  status ENUM('active','contained','resolved') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  richter DECIMAL(4,1) NULL COMMENT 'магнитуда (Рихтер/ML)',
  focal_depth_km DECIMAL(6,1) NULL COMMENT 'дълбочина хипоцентър km',
  wind_gust_kmh SMALLINT UNSIGNED NULL COMMENT 'макс. пориви km/h',
  rainfall_mm SMALLINT UNSIGNED NULL COMMENT 'валеж 24h mm',
  water_level_cm INT NULL COMMENT 'наднормено ниво вода cm',
  burned_area_ha DECIMAL(12,2) NULL COMMENT 'площ пожар ha',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_disasters_time (time),
  INDEX idx_disasters_status (status),
  INDEX idx_disasters_region (region)
);

-- Alerts / notifications
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(32) PRIMARY KEY,
  time DATETIME NOT NULL,
  region ENUM('all','Sofia','Varna','Plovdiv','Burgas') NOT NULL DEFAULT 'all',
  type ENUM('earthquake','flood','fire','storm','other') NOT NULL,
  level ENUM('low','medium','high','critical') NOT NULL,
  title VARCHAR(190) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('sent','scheduled') NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alerts_time (time),
  INDEX idx_alerts_region (region),
  INDEX idx_alerts_status (status)
);

-- Regions / zones
CREATE TABLE IF NOT EXISTS regions (
  id VARCHAR(32) PRIMARY KEY,
  city ENUM('Sofia','Varna','Plovdiv','Burgas') NOT NULL,
  category ENUM('affected','safe','shelter','risk') NOT NULL,
  name VARCHAR(190) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_regions_city (city),
  INDEX idx_regions_category (category)
);

