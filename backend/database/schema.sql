-- DentalCare Connect Database Schema
-- MySQL Database for Node.js Backend

-- Drop existing tables
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS dentists;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS admin;

-- Patients Table
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dentists Table
CREATE TABLE dentists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    rating FLOAT DEFAULT 0.0,
    bio TEXT,
    experience_years INT DEFAULT 0,
    available_days JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_specialty (specialty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Appointments Table
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    dentist_id INT NOT NULL,
    date DATETIME NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    symptoms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id),
    INDEX idx_dentist (dentist_id),
    INDEX idx_date (date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments Table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    appointment_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id),
    INDEX idx_appointment (appointment_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin Table
CREATE TABLE admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Sample Data
-- Admin (password: admin123)
INSERT INTO admin (name, email, password, role) VALUES
('Admin User', 'admin@dentalcare.com', '$2b$10$rKvVLZ8xqJ5YJ5YJ5YJ5YOqJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5Y', 'super_admin');

-- Sample Dentists (password: dentist123)
INSERT INTO dentists (name, specialty, email, password, phone, rating, bio, experience_years, available_days) VALUES
('Dr. Sarah Johnson', 'Orthodontist', 'sarah@dentalcare.com', '$2b$10$rKvVLZ8xqJ5YJ5YJ5YJ5YOqJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5Y', '+1-555-0101', 4.8, 'Specialized in teeth alignment and braces', 8, '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
('Dr. Ahmed Ali', 'Endodontist', 'ahmed@dentalcare.com', '$2b$10$rKvVLZ8xqJ5YJ5YJ5YJ5YOqJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5Y', '+1-555-0102', 4.9, 'Expert in root canal treatments', 10, '["Monday", "Wednesday", "Friday"]'),
('Dr. Aisha Karim', 'Periodontist', 'aisha@dentalcare.com', '$2b$10$rKvVLZ8xqJ5YJ5YJ5YJ5YOqJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5Y', '+1-555-0103', 4.7, 'Specialist in gum diseases', 6, '["Tuesday", "Thursday", "Saturday"]');

-- Sample Patient (password: patient123)
INSERT INTO patients (full_name, email, password, phone) VALUES
('John Doe', 'john@example.com', '$2b$10$rKvVLZ8xqJ5YJ5YJ5YJ5YOqJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5YJ5Y', '+1-555-1234');
