-- MT-API MariaDB Schema
-- Run this script to create the database and table

CREATE DATABASE IF NOT EXISTS mt_api;
USE mt_api;

CREATE TABLE IF NOT EXISTS `user_requests` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `fullName` VARCHAR(255) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `idCardNumber` VARCHAR(13) NULL UNIQUE,
  `phoneNumber` VARCHAR(20) NULL,
  `position` VARCHAR(100) NULL,
  `department` VARCHAR(100) NULL,
  `mikrotikDisabled` TINYINT(1) DEFAULT 0,
  `mikrotikExists` TINYINT(1) DEFAULT 0,
  `profile` VARCHAR(100) DEFAULT 'default',
  `status` ENUM('pending', 'approved') DEFAULT 'pending',
  `approvedAt` DATETIME NULL,
  `expiryDate` DATE NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_status` (`status`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `positions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(100) NOT NULL,
  `entityType` VARCHAR(100) NOT NULL DEFAULT 'system',
  `entityId` VARCHAR(100) NULL,
  `actorUsername` VARCHAR(100) NOT NULL DEFAULT 'system',
  `actorRole` VARCHAR(50) NOT NULL DEFAULT 'system',
  `status` ENUM('success', 'warning', 'failed', 'info') NOT NULL DEFAULT 'success',
  `details` LONGTEXT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_action` (`action`),
  KEY `idx_actor` (`actorUsername`),
  KEY `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `login_history` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL DEFAULT '',
  `role` VARCHAR(50) NOT NULL DEFAULT 'guest',
  `status` ENUM('success', 'failed') NOT NULL DEFAULT 'success',
  `source` VARCHAR(30) NOT NULL DEFAULT 'dashboard',
  `ipAddress` VARCHAR(120) NULL,
  `userAgent` TEXT NULL,
  `message` VARCHAR(255) NULL,
  `metadata` LONGTEXT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_username` (`username`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `generated_users` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `profile` VARCHAR(100) DEFAULT 'default',
  `comment` VARCHAR(255) NULL,
  `fullName` VARCHAR(255) NULL,
  `type` ENUM('generated','imported') DEFAULT 'generated',
  `status` ENUM('generated','synced','disabled','removed') DEFAULT 'generated',
  `mikrotikSynced` TINYINT(1) DEFAULT 0,
  `expiryDate` DATE NULL,
  `batchLabel` VARCHAR(100) NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_gen_status` (`status`),
  KEY `idx_gen_type` (`type`),
  KEY `idx_gen_username` (`username`),
  KEY `idx_gen_batch` (`batchLabel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admin user for backend (optional, for reference)
-- You can also just use ADMIN_USERNAME and ADMIN_PASSWORD from .env
