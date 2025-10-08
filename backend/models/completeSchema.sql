CREATE DATABASE IF NOT EXISTS attendance_system;
USE attendance_system;


CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,  
    employee_id VARCHAR(50) UNIQUE NOT NULL,      -- unique per site
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL, 
    phone VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    profilePhoto TEXT,            
    password TEXT NOT NULL,   
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,  
    employee_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    status VARCHAR(10) NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')),

    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE,
    UNIQUE KEY uniq_attendance (employee_id, date) -- prevent duplicates for same day
);


CREATE TABLE IF NOT EXISTS site_meta (
    site_id CHAR(36) PRIMARY KEY,       -- UUID unique per site
    site_name VARCHAR(100) NOT NULL,
    setup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_sync_timestamp DATETIME,       -- last successful sync
    sync_status ENUM('idle','in_progress','failed') DEFAULT 'idle'
);


-- Users
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_updated_at ON users(updated_at);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_designation ON users(designation);

-- Attendance
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);