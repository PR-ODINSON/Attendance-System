import pool from '../database.js';
import cron from 'node-cron';

export const markAttendance = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "User name is required" });

    const [[user]] = await pool.query("SELECT employee_id FROM users WHERE name = ?", [name]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const employeeId = user.employee_id;
    const currentDate = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
    const [[attendance]] = await pool.query("SELECT * FROM attendance WHERE employee_id = ? AND date = ?", [employeeId, currentDate]);

    const status = determineAttendanceStatus(currentTime);

    if (!attendance) {
      await pool.query(`
        INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status)
        VALUES (?, ?, ?, NULL, ?)`,
        [employeeId, currentDate, currentTime, status]
      );
      return res.status(200).json({ message: "Check-in recorded successfully" });
    } else {
      await pool.query("UPDATE attendance SET check_out_time = ? WHERE employee_id = ? AND date = ?", [currentTime, employeeId, currentDate]);
      return res.status(200).json({ message: "Check-out recorded successfully" });
    }

  } catch (error) {
    console.error("Error in attendance route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const determineAttendanceStatus = (currentTime) => {
  if (currentTime >= "09:00:00" && currentTime <= "10:30:00") return "Present";
  if (currentTime > "10:30:00" && currentTime <= "14:30:00") return "Late";
  return "Absent";
};

export const initializeAbsentMarking = () => {
  cron.schedule('30 14 * * *', async () => {
    const currentDate = new Date().toISOString().split("T")[0];
    try {
      const [users] = await pool.query("SELECT employee_id FROM users");
      for (const user of users) {
        const [[attendance]] = await pool.query("SELECT * FROM attendance WHERE employee_id = ? AND date = ?", [user.employee_id, currentDate]);
        if (!attendance) {
          await pool.query(`
            INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status)
            VALUES (?, ?, NULL, NULL, 'Absent')`, [user.employee_id, currentDate]
          );
          console.log(`Marked ${user.employee_id} as absent`);
        }
      }
    } catch (error) {
      console.error("Error in absent marking:", error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};

export const getMyAttendance = async (req, res) => {
  try {
    const { email } = req.user;
    const [[user]] = await pool.query("SELECT employee_id FROM users WHERE email = ?", [email]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const [rows] = await pool.query("SELECT * FROM attendance WHERE employee_id = ?", [user.employee_id]);
    res.status(200).json(rows);
  } catch (err) {
    console.error("getMyAttendance error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFilteredAttendance = async (req, res) => {
  try {
    const { employee_id, name, department, designation, date } = req.query;
    const selectedDate = date || new Date().toISOString().split("T")[0];

    let userQuery = "SELECT employee_id, name, department, designation, profilePhoto FROM users WHERE 1=1";
    let queryParams = [];

    if (employee_id) { userQuery += " AND employee_id = ?"; queryParams.push(employee_id); }
    if (department) { userQuery += " AND department = ?"; queryParams.push(department); }
    if (designation) { userQuery += " AND designation = ?"; queryParams.push(designation); }
    if (name) { userQuery += " AND name LIKE ?"; queryParams.push(`%${name}%`); }

    const [users] = await pool.query(userQuery, queryParams);
    if (!users.length) return res.status(200).json([]);

    const ids = users.map(u => u.employee_id);
    const [attendance] = await pool.query(`SELECT * FROM attendance WHERE date = ? AND employee_id IN (${ids.map(() => "?").join(",")})`, [selectedDate, ...ids]);

    const combined = attendance.map(a => ({
      ...a,
      ...(users.find(u => u.employee_id === a.employee_id) || {})
    }));

    res.status(200).json(combined);
  } catch (err) {
    console.error("getFilteredAttendance error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllAttendance = async (req, res) => {
  try {
    const [attendance] = await pool.query("SELECT * FROM attendance");
    const ids = attendance.map(a => a.employee_id);
    const [users] = await pool.query(`SELECT employee_id, name, department, designation FROM users WHERE employee_id IN (${ids.map(() => "?").join(",")})`, ids);

    const combined = attendance.map(a => ({
      ...a,
      ...(users.find(u => u.employee_id === a.employee_id) || {})
    }));

    const grouped = combined.reduce((acc, entry) => {
      const date = new Date(entry.date).toLocaleDateString();
      acc[date] = acc[date] || [];
      acc[date].push(entry);
      return acc;
    }, {});

    res.status(200).json(grouped);
  } catch (err) {
    console.error("getAllAttendance error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const [attendance] = await pool.query("SELECT * FROM attendance WHERE employee_id = ?", [employeeId]);
    const [[user]] = await pool.query("SELECT name FROM users WHERE employee_id = ?", [employeeId]);

    const result = attendance.map(a => ({ ...a, name: user?.name || "Unknown" }));
    res.status(200).json(result);
  } catch (err) {
    console.error("getEmployeeAttendance error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getEmployeeAttendanceWithUser = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const [attendance] = await pool.query("SELECT * FROM attendance WHERE employee_id = ?", [employeeId]);
    const [[user]] = await pool.query("SELECT name FROM users WHERE employee_id = ?", [employeeId]);

    const result = attendance.map(a => ({ ...a, name: user?.name || "Unknown" }));
    res.status(200).json(result);
  } catch (err) {
    console.error("getEmployeeAttendanceWithUser error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getBarAttendance = async (req, res) => {
  try {
    const [data] = await pool.query("SELECT check_in_time, check_out_time, status, employee_id, date FROM attendance");
    res.status(200).json(data);
  } catch (err) {
    console.error("getBarAttendance error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
