import pool from "../database.js";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

const uploadDir = "uploads";

export const registerByAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      department,
      designation,
      password,
      employee_id,
      adminEmail,
      adminPassword,
    } = req.body;

    // If registering an admin, verify the current admin's credentials
    if (designation.toLowerCase() === "admin") {
      if (!adminEmail || !adminPassword) {
        return res.status(400).json({
          error: "Admin credentials required for registering new admin",
        });
      }

      // Verify admin credentials
      const [admin] = await pool.query(
        "SELECT password FROM users WHERE email = ? AND designation = ?",
        [adminEmail, "admin"]
      );

      if (!admin || admin.length === 0) {
        return res.status(401).json({
          error: "Invalid admin credentials",
        });
      }

      const validPassword = await bcrypt.compare(
        adminPassword,
        admin[0].password
      );
      if (!validPassword) {
        return res.status(401).json({
          error: "Invalid admin credentials",
        });
      }
    }

    // Check if user already exists
    const [existingUser] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR employee_id = ?",
      [email, employee_id]
    );

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({
        error: "User with this email or employee ID already exists",
      });
    }

    // Create a folder for the employee
    const employeeDir = path.join(uploadDir, name);
    if (!fs.existsSync(employeeDir)) {
      fs.mkdirSync(employeeDir, { recursive: true });
    }

    // Handle file uploads
    const profilePhotos = req.files.map((file, index) => {
      const ext = path.extname(file.originalname);
      const newFileName = `${name}_${index}${ext}`;
      const newFilePath = path.join(employeeDir, newFileName);
      fs.renameSync(file.path, newFilePath);
      return newFileName;
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await pool.query(
      `INSERT INTO users (
                employee_id, name, email, phone, department, 
                designation, profilePhoto, password, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        employee_id,
        name,
        email,
        phone,
        department,
        designation,
        JSON.stringify(profilePhotos),
        hashedPassword,
      ]
    );

    if (!result.affectedRows) {
      throw new Error("Failed to register user");
    }

    // Create embeddings for face recognition
    console.log("Starting embeddings creation...");
    const scriptPath =
      "C:/Users/ayaan/OneDrive/Desktop/IITRAM/InSolare Project/New attendance git/flaskServer/createEmbeddings.py";
    const uploadFolder = path.join("uploads", name);

    exec(
      `python "${scriptPath}" "${uploadFolder}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Embedding Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`Embedding stderr: ${stderr}`);
        }
        console.log(`Embeddings created successfully: ${stdout}`);
      }
    );

    res.status(201).json({
      message: "Registration Successful",
      employee: {
        name,
        email,
        designation,
        employee_id,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Specific error handling
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Employee ID or email already exists",
      });
    }

    res.status(500).json({
      error: "Failed to register user",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    const [employees] = await pool.query(
      "SELECT employee_id, name, department, designation, profilePhoto FROM users"
    );
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

export const startFaceRecognition = async (req, res) => {
    try {
        exec("python faceRecognition.py", { cwd: "../flaskServer" }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Execution error: ${error}`);
                return res.status(500).json({ error: "Failed to start face recognition." });
            }
            console.log(`stdout: ${stdout}`);
            res.status(200).json({ message: "Face recognition started successfully." });
        });
    } catch (error) {
        console.error("Error starting face recognition:", error);
        res.status(500).json({ error: "Failed to start face recognition." });
    }
};