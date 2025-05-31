CREATE DATABASE IF NOT EXISTS attendance_system;

USE attendance_system;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,  
    employee_id VARCHAR(50) UNIQUE NOT NULL,      
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL, 
    phone VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    profilePhoto TEXT,            
    password TEXT NOT NULL,   
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,  
    employee_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    status VARCHAR(10) NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')),
    FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_users_email ON users(email); 