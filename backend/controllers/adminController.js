import pool from "../database.js";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        profilePhotos[0],
        hashedPassword,
      ]
    );

    if (!result.affectedRows) {
      throw new Error("Failed to register user");
    }

    // Create embeddings for face recognition
    console.log("Starting embeddings creation...");
    const scriptPath = path.resolve(
      __dirname,
      "..",
      "..",
      "flaskServer",
      "createEmbeddings.py"
    );
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

// Update employee details
export const updateEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const {
      name,
      email,
      phone,
      department,
      designation,
      password,
      adminEmail,
      adminPassword,
    } = req.body;

    // Get current employee data
    const [currentEmployee] = await pool.query(
      "SELECT * FROM users WHERE employee_id = ?",
      [employee_id]
    );

    if (!currentEmployee || currentEmployee.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const currentData = currentEmployee[0];

    // If changing to admin or if current designation is admin, verify admin credentials
    if (
      designation?.toLowerCase() === "admin" ||
      currentData.designation.toLowerCase() === "admin"
    ) {
      if (!adminEmail || !adminPassword) {
        return res.status(400).json({
          error: "Admin credentials required for this operation",
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

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name && name !== currentData.name) {
      updates.push("name = ?");
      values.push(name);

      // Rename employee folder if name changed
      const oldDir = path.join(uploadDir, currentData.name);
      const newDir = path.join(uploadDir, name);
      if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
        fs.renameSync(oldDir, newDir);
      }
    }

    if (email && email !== currentData.email) {
      // Check if new email already exists
      const [existingEmail] = await pool.query(
        "SELECT id FROM users WHERE email = ? AND employee_id != ?",
        [email, employee_id]
      );
      if (existingEmail && existingEmail.length > 0) {
        return res.status(400).json({
          error: "Email already exists",
        });
      }
      updates.push("email = ?");
      values.push(email);
    }

    if (phone) {
      updates.push("phone = ?");
      values.push(phone);
    }

    if (department) {
      updates.push("department = ?");
      values.push(department);
    }

    if (designation) {
      updates.push("designation = ?");
      values.push(designation);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push("password = ?");
      values.push(hashedPassword);
    }

    // Handle profile photo upload if files are provided
    if (req.files && req.files.length > 0) {
      const employeeDir = path.join(uploadDir, name || currentData.name);
      if (!fs.existsSync(employeeDir)) {
        fs.mkdirSync(employeeDir, { recursive: true });
      }

      const profilePhotos = req.files.map((file, index) => {
        const ext = path.extname(file.originalname);
        const newFileName = `${name || currentData.name}_${index}${ext}`;
        const newFilePath = path.join(employeeDir, newFileName);
        fs.renameSync(file.path, newFilePath);
        return newFileName;
      });

      updates.push("profilePhoto = ?");
      values.push(profilePhotos[0]);

      // Regenerate embeddings if photos changed
      const scriptPath = path.resolve(
        __dirname,
        "..",
        "..",
        "flaskServer",
        "createEmbeddings.py"
      );
      exec(
        `python "${scriptPath}" "${employeeDir}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Embedding Error: ${error.message}`);
          }
          if (stderr) {
            console.error(`Embedding stderr: ${stderr}`);
          }
          console.log(`Embeddings updated successfully: ${stdout}`);
        }
      );
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: "No fields to update",
      });
    }

    // Add employee_id to values for WHERE clause
    values.push(employee_id);

    const query = `UPDATE users SET ${updates.join(", ")} WHERE employee_id = ?`;
    const [result] = await pool.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.status(200).json({
      message: "Employee updated successfully",
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      error: "Failed to update employee",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { adminEmail, adminPassword } = req.body;

    // Get employee data
    const [employee] = await pool.query(
      "SELECT * FROM users WHERE employee_id = ?",
      [employee_id]
    );

    if (!employee || employee.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employeeData = employee[0];

    // If deleting an admin, require admin authentication
    if (employeeData.designation.toLowerCase() === "admin") {
      if (!adminEmail || !adminPassword) {
        return res.status(400).json({
          error: "Admin credentials required to delete admin users",
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

      // Prevent deleting yourself
      if (adminEmail === employeeData.email) {
        return res.status(400).json({
          error: "Cannot delete your own admin account",
        });
      }
    }

    // Delete employee from database
    const [result] = await pool.query(
      "DELETE FROM users WHERE employee_id = ?",
      [employee_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Delete employee folder
    const employeeDir = path.join(uploadDir, employeeData.name);
    if (fs.existsSync(employeeDir)) {
      fs.rmSync(employeeDir, { recursive: true, force: true });
    }

    res.status(200).json({
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      error: "Failed to delete employee",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get single employee details
export const getEmployeeById = async (req, res) => {
  try {
    const { employee_id } = req.params;

    const [employee] = await pool.query(
      "SELECT employee_id, name, email, phone, department, designation, profilePhoto, created_at FROM users WHERE employee_id = ?",
      [employee_id]
    );

    if (!employee || employee.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.status(200).json(employee[0]);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: "Failed to fetch employee details" });
  }
};