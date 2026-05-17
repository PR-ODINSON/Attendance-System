import pool from "../database.js";
import bcrypt from "bcrypt";

// GET /api/user/name
export const getUserName = async (req, res) => {
  try {
    const { email } = req.user;
    const [rows] = await pool.query("SELECT name FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ name: rows[0].name });
  } catch (err) {
    console.error("getUserName error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/user/profilePhoto
export const getUserProfilePhoto = async (req, res) => {
  try {
    const { email } = req.user;
    const [rows] = await pool.query("SELECT profilePhoto FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ error: "Profile photo not found" });
    res.json({ profilePhoto: rows[0].profilePhoto });
  } catch (err) {
    console.error("getUserProfilePhoto error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/user
export const getUserDetails = async (req, res) => {
  try {
    const { email } = req.user;
    const [rows] = await pool.query(
      "SELECT name, employee_id, email, phone, department, designation, profilePhoto FROM users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("getUserDetails error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// PATCH /api/users/update
// Note: Data added through models (name, email, phone, department, designation, employee_id) cannot be edited
// Only password can be updated
export const updateUserDetails = async (req, res) => {
  try {
    const { email } = req.user;
    const { name, phone, oldPassword, newPassword } = req.body;

    // Reject attempts to update name or phone - these are model data and cannot be edited
    if (name || phone) {
      return res.status(403).json({ 
        error: "Name and phone cannot be modified. Data added through models is protected from editing." 
      });
    }

    const [users] = await pool.query("SELECT password FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ error: "User not found" });

    // Only allow password updates
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Both old and new passwords are required" });
    }

    const isMatch = await bcrypt.compare(oldPassword, users[0].password);
    if (!isMatch) return res.status(401).json({ error: "Old password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [result] = await pool.query(
      "UPDATE users SET password = ? WHERE email = ?", 
      [hashedPassword, email]
    );
    
    if (result.affectedRows === 0) return res.status(500).json({ error: "Update failed" });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("updateUserDetails error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/user/history or /api/user/attendance
export const getUserAttendance = async (req, res) => {
  try {
    const { email } = req.user;
    const [[{ employee_id }]] = await pool.query("SELECT employee_id FROM users WHERE email = ?", [email]);
    const [attendance] = await pool.query("SELECT * FROM attendance WHERE employee_id = ?", [employee_id]);
    res.json(attendance);
  } catch (err) {
    console.error("getUserAttendance error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
