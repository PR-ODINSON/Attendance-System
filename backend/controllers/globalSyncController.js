import fs from "fs";
import path from "path";
import pool from "../database.js";

const LOG_FILE = path.join(process.cwd(), "syncLogs.log");

/**
 * Append a log entry to syncLogs.log
 */
function writeLog(message) {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // UTC → IST
  const timestamp = istTime.toISOString().replace("T", " ").substring(0, 19);
  const logEntry = `[${timestamp} IST] ${message}\n`;

  fs.appendFile(LOG_FILE, logEntry, (err) => {
    if (err) {
      console.error("Failed to write to sync log:", err);
    }
  });
}

/**
 * Handle sync from local site → global server
 */
async function receiveSync(req, res) {
  const connection = await pool.getConnection();
  const { site_id, site_name, users = [], attendance = [] } = req.body;
  try {
    if (!site_id || !site_name) {
      writeLog(`Sync failed: Missing site_id or site_name`);
      return res.status(400).json({
        success: false,
        error: "site_id and site_name are required",
      });
    }

    await connection.beginTransaction();

    // 1. Ensure site exists
    await connection.query(
      `INSERT INTO sites (site_id, site_name)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE site_name = VALUES(site_name)`,
      [site_id, site_name]
    );

    // 2. Upsert users (includes admins as well)
    if (users.length > 0) {
      const userValues = await Promise.all(
        users.map(async (u) => {

          return [
            site_id,
            u.employee_id,
            u.name,
            u.email || null,
            u.phone || null,
            u.department || null,
            u.designation || null,
            u.profilePhoto || null,
            u.password,
          ];
        })
      );

      await connection.query(
        `INSERT INTO users (site_id, employee_id, name, email, phone, department, designation, profilePhoto, password)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           email = VALUES(email),
           phone = VALUES(phone),
           department = VALUES(department),
           designation = VALUES(designation),
           profilePhoto = VALUES(profilePhoto),
           password = VALUES(password)`,
        [userValues]
      );
    }

    // 3. Insert attendance
    if (attendance.length > 0) {
      const attValues = attendance.map((a) => [
        site_id,
        a.employee_id,
        a.date,
        a.check_in_time || null,
        a.check_out_time || null,
        a.status,
      ]);

      await connection.query(
        `INSERT INTO attendance (site_id, employee_id, date, check_in_time, check_out_time, status)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           check_in_time = VALUES(check_in_time),
           check_out_time = VALUES(check_out_time),
           status = VALUES(status)`,
        [attValues]
      );
    }

    await connection.commit();

    writeLog(
      `Sync successful for site '${site_name}' (${site_id}) — Users processed: ${users.length}, Attendance processed: ${attendance.length}`
    );

    await connection.query(
      `INSERT INTO sites (site_id, site_name, last_sync_timestamp)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
       site_name = VALUES(site_name),
       last_sync_timestamp = NOW()`,
      [site_id, site_name]
    );

    console.log(`Sync successful for site: ${site_name}-${site_id}`);

    return res.json({
      success: true,
      message: "Sync successful",
      inserted_users: users.length,
      inserted_attendance: attendance.length,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error during sync:", err);

    writeLog(
      `Sync failed for site '${site_name || "UNKNOWN"}' (${site_id || "NO_ID"}): ${err.message}`
    );

    return res.status(500).json({ success: false, error: "Sync failed" });
  } finally {
    connection.release();
  }
}

export default { receiveSync };
