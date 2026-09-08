-- Run this in MySQL Workbench / mysql CLI if you prefer to create tables yourself.
-- The Node server also creates these automatically on startup.

CREATE DATABASE IF NOT EXISTS node_simulator
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE node_simulator;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS simulations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schema_version INT DEFAULT 1,
  tags VARCHAR(255),
  data LONGTEXT NOT NULL,
  step_count INT DEFAULT 1,
  thumbnail LONGTEXT,
  is_public TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_simulations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_simulations_user_id ON simulations(user_id);
CREATE INDEX idx_simulations_updated_at ON simulations(updated_at);

CREATE TABLE IF NOT EXISTS simulation_backups (
  id VARCHAR(64) PRIMARY KEY,
  simulation_id VARCHAR(64) NOT NULL,
  schema_version INT NOT NULL,
  data LONGTEXT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_backups_simulation
    FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
);

CREATE INDEX idx_backups_sim_id ON simulation_backups(simulation_id);
