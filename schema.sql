-- SmartPrep AI – MySQL Schema
-- Run once:  mysql -u root -p smartprep_db < schema.sql

CREATE DATABASE IF NOT EXISTS smartprep_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE smartprep_db;

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(80)  NOT NULL,
  email        VARCHAR(191) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,          -- bcrypt hash
  selected_path  VARCHAR(80)  DEFAULT NULL,
  selected_skill VARCHAR(80)  DEFAULT NULL,
  current_day  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  dark_mode    TINYINT(1)   NOT NULL DEFAULT 0,
  notifications TINYINT(1)  NOT NULL DEFAULT 1,
  role         ENUM('user','admin','superuser') NOT NULL DEFAULT 'user',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Day Progress ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS day_progress (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id   INT UNSIGNED NOT NULL,
  skill     VARCHAR(80)  NOT NULL,
  day       TINYINT UNSIGNED NOT NULL,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_skill_day (user_id, skill, day),
  CONSTRAINT fk_dp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Quiz Results ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_results (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id   INT UNSIGNED NOT NULL,
  skill     VARCHAR(80)  NOT NULL,
  day       TINYINT UNSIGNED NOT NULL,
  score     TINYINT UNSIGNED NOT NULL,
  total     TINYINT UNSIGNED NOT NULL,
  passed    TINYINT(1)   NOT NULL,
  taken_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_qr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Mock Test Results ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_test_results (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  score       TINYINT UNSIGNED NOT NULL,
  total       TINYINT UNSIGNED NOT NULL,
  accuracy    DECIMAL(5,2)  NOT NULL,
  time_taken  SMALLINT UNSIGNED NOT NULL,        -- seconds
  weak_areas  JSON          NOT NULL DEFAULT (_utf8mb4'[]'),
  taken_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Questions (managed by superuser) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  skill       VARCHAR(80)  NOT NULL,
  day         TINYINT UNSIGNED NOT NULL,
  question    TEXT         NOT NULL,
  option_a    VARCHAR(500) NOT NULL,
  option_b    VARCHAR(500) NOT NULL,
  option_c    VARCHAR(500) NOT NULL,
  option_d    VARCHAR(500) NOT NULL,
  answer      ENUM('A','B','C','D') NOT NULL,
  explanation TEXT         DEFAULT NULL,
  created_by  INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_q_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Course Content (editable by superuser/admin) ─────────────────────────────
CREATE TABLE IF NOT EXISTS course_content (
  section    VARCHAR(60)  NOT NULL PRIMARY KEY,
  data       JSON         NOT NULL,
  updated_by INT UNSIGNED DEFAULT NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cc_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
