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
export const updateUserDetails = async (req, res) => {
  try {
    const { email } = req.user;
    const { name, phone, oldPassword, newPassword } = req.body;

    const [users] = await pool.query("SELECT password FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ error: "User not found" });

    let updateFields = [];
    let values = [];

    if (name) {
      updateFields.push("name = ?");
      values.push(name);
    }

    if (phone) {
      updateFields.push("phone = ?");
      values.push(phone);
    }

    if (oldPassword && newPassword) {
      const isMatch = await bcrypt.compare(oldPassword, users[0].password);
      if (!isMatch) return res.status(401).json({ error: "Old password is incorrect" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateFields.push("password = ?");
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(email);
    const [result] = await pool.query(`UPDATE users SET ${updateFields.join(", ")} WHERE email = ?`, values);
    if (result.affectedRows === 0) return res.status(500).json({ error: "Update failed" });

    res.json({ message: "User details updated successfully" });
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
