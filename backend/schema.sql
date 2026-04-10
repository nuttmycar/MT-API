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
  `profile` VARCHAR(100) DEFAULT 'default',
  `status` ENUM('pending', 'approved') DEFAULT 'pending',
  `approvedAt` DATETIME NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_status` (`status`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admin user for backend (optional, for reference)
-- You can also just use ADMIN_USERNAME and ADMIN_PASSWORD from .env
