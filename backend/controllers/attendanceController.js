import pool from '../database.js';
import cron from 'node-cron';

export const markAttendance = async (req, res) => {
  try {
    const { name, action_type } = req.body;
    if (!name) return res.status(400).json({ error: "User name is required" });
    if (!action_type) return res.status(400).json({ error: "Action type is required" });
    if (!["check_in", "check_out"].includes(action_type)) {
      return res.status(400).json({ error: "Invalid action_type. Must be 'check_in' or 'check_out'" });
    }

    const [[user]] = await pool.query("SELECT employee_id FROM users WHERE name = ?", [name]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const employeeId = user.employee_id;
    const { currentDate, currentTime } = getCurrentDateTime();
    
    if (action_type === "check_in") {
      const [[openSession]] = await pool.query(
        `SELECT id FROM detailed_attendance_sessions
         WHERE employee_id = ? AND session_date = ? AND check_out IS NULL
         ORDER BY check_in DESC, id DESC
         LIMIT 1`,
        [employeeId, currentDate]
      );

      if (openSession) {
        return res.status(200).json({ message: "Already checked in. Active session is open." });
      }

      const [[existingAttendance]] = await pool.query(
        "SELECT * FROM attendance WHERE employee_id = ? AND date = ?",
        [employeeId, currentDate]
      );

      const status = determineAttendanceStatus(currentTime);

      if (!existingAttendance) {
        await pool.query(
          `
          INSERT INTO attendance (employee_id, date, check_in_time, check_out_time, status)
          VALUES (?, ?, ?, NULL, ?)`,
          [employeeId, currentDate, currentTime, status],
        );
      } else if (!existingAttendance.check_in_time) {
        await pool.query(
          "UPDATE attendance SET check_in_time = ?, status = ? WHERE employee_id = ? AND date = ?",
          [currentTime, status, employeeId, currentDate],
        );
      } else if (existingAttendance.check_out_time) {
        // Already has check_in and check_out, so this is a new session after checkout
        // Reset check_out to NULL to reflect current active session
        // Recheck the status and update if necessary
        const new_status = determineAttendanceStatus(existingAttendance.check_in_time);
        await pool.query(
          "UPDATE attendance SET check_out_time = NULL, status = ? WHERE employee_id = ? AND date = ?",
          [new_status, employeeId, currentDate],
        );
      }

      await pool.query(`
        INSERT INTO detailed_attendance_sessions (employee_id, session_date, check_in)
        VALUES (?, ?, ?)`,
        [employeeId, currentDate, currentTime]
      );

      return res.status(200).json({
        message: existingAttendance ? "Session check-in recorded successfully" : "Check-in recorded successfully",
        status
      });

    } else if (action_type === "check_out") {
      const [[attendance]] = await pool.query(
        "SELECT * FROM attendance WHERE employee_id = ? AND date = ?",
        [employeeId, currentDate]
      );

      if (!attendance || !attendance.check_in_time) {
        return res.status(400).json({ error: "No check-in found for today. Please check-in first." });
      }

      const [[openSession]] = await pool.query(
        `SELECT id, check_in FROM detailed_attendance_sessions
         WHERE employee_id = ? AND session_date = ? AND check_out IS NULL
         ORDER BY check_in DESC, id DESC
         LIMIT 1`,
        [employeeId, currentDate]
      );

      if (!openSession) {
        return res.status(400).json({ error: "No active check-in session found. Please check-in first." });
      }

      const workingHours = calculateWorkingHours(attendance.check_in_time, currentTime);
      const sessionMinutes = Math.max(
        0,
        Math.round(calculateWorkingHours(openSession.check_in, currentTime) * 60)
      );

      let finalStatus = attendance.status;
      if (workingHours < 8 && finalStatus !== "Late" && finalStatus !== "Absent") {
        finalStatus = "Left Early";
      } else if (workingHours >= 8) {
        finalStatus = "Present";
      } else if (attendance.status === "Late" || attendance.status === "Absent") {
        finalStatus = attendance.status;
      }

      await pool.query(
        "UPDATE attendance SET check_out_time = ?, status = ? WHERE employee_id = ? AND date = ?",
        [currentTime, finalStatus, employeeId, currentDate]
      );

      await pool.query(
        `UPDATE detailed_attendance_sessions
         SET check_out = ?, session_duration_minutes = ?
         WHERE id = ?`,
        [currentTime, sessionMinutes, openSession.id]
      );

      return res.status(200).json({
        message: "Check-out recorded successfully",
        workingHours: workingHours.toFixed(2),
        sessionMinutes,
        status: finalStatus
      });
    }

  } catch (error) {
    console.error("Error in markAttendance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCurrentDateTime = () => {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const datePartMap = Object.fromEntries(
    dateParts
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  );
  const currentDate = `${datePartMap.year}-${datePartMap.month}-${datePartMap.day}`;
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(now);

  return { currentDate, currentTime };
};

const determineAttendanceStatus = (currentTime) => {
  // Accept check-ins from 6:00 AM onwards
  if (currentTime >= "06:00:00" && currentTime <= "10:30:00") return "Present";
  if (currentTime > "10:30:00" && currentTime <= "14:30:00") return "Late";
  return "Absent";
};

const calculateWorkingHours = (checkInTime, checkOutTime) => {
  // Convert time strings to minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 60 + minutes + (seconds / 60);
  };
  
  const checkInMinutes = timeToMinutes(checkInTime);
  const checkOutMinutes = timeToMinutes(checkOutTime);
  
  // Calculate difference in hours
  const diffMinutes = checkOutMinutes - checkInMinutes;
  return diffMinutes / 60;
};

const calculateDurationMinutes = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  return Math.max(0, Math.round(calculateWorkingHours(startTime, endTime) * 60));
};

export const initializeAbsentMarking = () => {
  cron.schedule('30 14 * * *', async () => {
    const currentDate = getCurrentDateTime().currentDate;
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
    const [[user]] = await pool.query("SELECT name, email FROM users WHERE employee_id = ?", [employeeId]);

    if (!attendance.length) {
      // No attendance, send name and email from users table
      if (user) {
        return res.status(200).json({ name: user.name, email: user.email });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    }

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

// Helper function to get date range based on period
const getDateRange = (period) => {
  const todayDate = getCurrentDateTime().currentDate;
  const today = new Date(`${todayDate}T00:00:00`);
  let startDate, endDate;

  switch (period) {
    case "today":
      startDate = todayDate;  // Already in correct IST format
      endDate = todayDate;
      break;
    case "month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case "alltime":
      startDate = new Date("2000-01-01");
      endDate = new Date();
      break;
    default:
      startDate = new Date(today);
      endDate = new Date(today);
  }

  return { startDate: startDate, endDate: endDate };
};

// Helper function to convert minutes to HH:MM format
const formatDuration = (minutes) => {
  if (!minutes) return "00:00";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const formatDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.split("T")[0];
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getSessionDownloadDateRange = (period) => {
  const todayDate = getCurrentDateTime().currentDate;
  const today = new Date(`${todayDate}T00:00:00`);
  let startDate;
  let endDate;

  switch (period) {
    case "week": {
      const dayOfWeek = today.getDay();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      startDate = formatDateValue(weekStart);
      endDate = formatDateValue(weekEnd);
      break;
    }
    case "month":
      startDate = formatDateValue(new Date(today.getFullYear(), today.getMonth(), 1));
      endDate = formatDateValue(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      break;
    case "alltime":
      startDate = "2000-01-01";
      endDate = todayDate;
      break;
    case "today":
    default:
      startDate = todayDate;
      endDate = todayDate;
  }

  return { startDate, endDate };
};

// Get session statistics for a given employee and period
export const getSessionStatistics = async (req, res) => {
  try {
    const { employeeId, period = "today" } = req.query;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const { startDate, endDate } = getDateRange(period);

    const [sessions] = await pool.query(
      `SELECT session_date, check_in, check_out, session_duration_minutes
       FROM detailed_attendance_sessions 
       WHERE employee_id = ? AND session_date >= ? AND session_date <= ?
       ORDER BY session_date, check_in`,
      [employeeId, startDate, endDate]
    );

    if (!sessions.length) {
      return res.status(200).json({
        period,
        total_cycles: 0,
        completed_sessions: 0,
        active_sessions: 0,
        avg_session_duration_minutes: 0,
        total_time_inside_minutes: 0,
        total_time_outside_minutes: 0,
        formatted: {
          avg_session_duration: "00:00",
          total_time_inside: "00:00",
          total_time_outside: "00:00"
        }
      });
    }

    const completedSessions = sessions.filter(session => session.check_out);
    const activeSessions = sessions.length - completedSessions.length;
    const totalTimeInside = completedSessions.reduce(
      (sum, session) => sum + (session.session_duration_minutes ?? calculateDurationMinutes(session.check_in, session.check_out)),
      0
    );
    const avgDuration = completedSessions.length > 0
      ? Math.round(totalTimeInside / completedSessions.length)
      : 0;

    let totalTimeOutside = 0;
    for (let i = 1; i < sessions.length; i += 1) {
      const previous = sessions[i - 1];
      const current = sessions[i];
      if (
        previous.session_date?.toString() === current.session_date?.toString() &&
        previous.check_out &&
        current.check_in
      ) {
        totalTimeOutside += calculateDurationMinutes(previous.check_out, current.check_in);
      }
    }

    res.status(200).json({
      period,
      total_cycles: sessions.length,
      completed_sessions: completedSessions.length,
      active_sessions: activeSessions,
      avg_session_duration_minutes: avgDuration,
      total_time_inside_minutes: totalTimeInside,
      total_time_outside_minutes: Math.max(0, totalTimeOutside),
      formatted: {
        avg_session_duration: formatDuration(avgDuration),
        total_time_inside: formatDuration(totalTimeInside),
        total_time_outside: formatDuration(Math.max(0, totalTimeOutside))
      }
    });

  } catch (error) {
    console.error("getSessionStatistics error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get detailed session entries for a specific employee and date
export const getSessionDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date = getCurrentDateTime().currentDate } = req.query;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const [sessions] = await pool.query(
      `SELECT id, check_in, check_out, session_duration_minutes 
       FROM detailed_attendance_sessions 
       WHERE employee_id = ? AND session_date = ?
       ORDER BY check_in ASC, id ASC`,
      [employeeId, date]
    );

    // Format sessions for display with out-time calculation
    const formattedSessions = sessions.map((session, index) => {
      let outTimeMinutes = null;
      let outTimeFormatted = "-";

      // Calculate out_time if this is not the last session
      if (index < sessions.length - 1) {
        const nextSession = sessions[index + 1];
        if (session.check_out && nextSession.check_in) {
          outTimeMinutes = calculateDurationMinutes(session.check_out, nextSession.check_in);
          outTimeFormatted = formatDuration(outTimeMinutes);
        }
      }

      return {
        id: session.id,
        sequence: index + 1,
        check_in: session.check_in,
        check_out: session.check_out,
        duration_minutes: session.session_duration_minutes,
        duration_formatted: session.check_out ? formatDuration(session.session_duration_minutes) : "-",
        out_time_minutes: outTimeMinutes,
        out_time_formatted: outTimeFormatted,
        status: session.check_out ? "Completed" : "Active"
      };
    });

    res.status(200).json({
      employeeId,
      date,
      total_sessions: formattedSessions.length,
      sessions: formattedSessions
    });

  } catch (error) {
    console.error("getSessionDetails error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get detailed session entries for CSV/download over a selected period
export const getSessionDownloadData = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { period = "today" } = req.query;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const { startDate, endDate } = getSessionDownloadDateRange(period);
    const [[user]] = await pool.query(
      "SELECT name FROM users WHERE employee_id = ?",
      [employeeId]
    );

    const [sessions] = await pool.query(
      `SELECT id, session_date, check_in, check_out, session_duration_minutes
       FROM detailed_attendance_sessions
       WHERE employee_id = ? AND session_date >= ? AND session_date <= ?
       ORDER BY session_date ASC, check_in ASC, id ASC`,
      [employeeId, startDate, endDate]
    );

    const sequenceByDate = {};
    const formattedSessions = sessions.map((session, index) => {
      const sessionDate = formatDateValue(session.session_date);
      const nextSession = sessions[index + 1];
      const nextSessionDate = nextSession ? formatDateValue(nextSession.session_date) : null;
      let outTimeMinutes = null;
      let outTimeFormatted = "-";

      sequenceByDate[sessionDate] = (sequenceByDate[sessionDate] || 0) + 1;

      if (
        nextSession &&
        sessionDate === nextSessionDate &&
        session.check_out &&
        nextSession.check_in
      ) {
        outTimeMinutes = calculateDurationMinutes(session.check_out, nextSession.check_in);
        outTimeFormatted = formatDuration(outTimeMinutes);
      }

      return {
        id: session.id,
        date: sessionDate,
        sequence: sequenceByDate[sessionDate],
        check_in: session.check_in,
        check_out: session.check_out,
        duration_minutes: session.session_duration_minutes,
        duration_formatted: session.check_out ? formatDuration(session.session_duration_minutes) : "-",
        out_time_minutes: outTimeMinutes,
        out_time_formatted: outTimeFormatted,
        status: session.check_out ? "Completed" : "Active"
      };
    });

    res.status(200).json({
      employeeId,
      employeeName: user?.name || "",
      period,
      startDate,
      endDate,
      total_sessions: formattedSessions.length,
      sessions: formattedSessions
    });

  } catch (error) {
    console.error("getSessionDownloadData error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
