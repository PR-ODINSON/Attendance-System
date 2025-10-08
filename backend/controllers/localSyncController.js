import pool from "../database.js";

/**
 * Fetch site metadata (site_id, site_name, last_sync_timestamp, sync_status)
 */
async function getSiteDetails() {
  const [rows] = await pool.query(
    "SELECT site_id, site_name, last_sync_timestamp, sync_status FROM site_meta LIMIT 1"
  );
  return rows.length ? rows[0] : null;
}

/**
 * Fetch users updated since last sync
 */
async function getUnsyncedUsers(lastSyncTimestamp) {
  const [rows] = await pool.query(
    `SELECT employee_id, name, email, phone, department, designation, profilePhoto, password, updated_at
     FROM users
     WHERE updated_at > ?`,
    [lastSyncTimestamp || "2000-01-01"]
  );
  return rows;
}

/**
 * Fetch attendance since last sync
 */
async function getUnsyncedAttendance(lastSyncTimestamp) {
  const [rows] = await pool.query(
    `SELECT employee_id, 
     DATE_FORMAT(date, '%Y-%m-%d') AS date,
     TIME_FORMAT(check_in_time, '%H:%i:%s') AS check_in_time,
     TIME_FORMAT(check_out_time, '%H:%i:%s') AS check_out_time,
     status
     FROM attendance
     WHERE date >= DATE(?)`,
    [lastSyncTimestamp || "2000-01-01"]
  );
  return rows;
}

/**
 * Prepare payload for syncing to global server
 * Returns { success, payload } instead of res.json
 */
async function prepareSyncData() {
  try {
    const siteDetails = await getSiteDetails();
    if (!siteDetails) {
      return { success: false, error: "Site metadata missing" };
    }

    // Mark sync in progress
    await pool.query(
      "UPDATE site_meta SET sync_status = 'in_progress' WHERE site_id = ?",
      [siteDetails.site_id]
    );

    // Fetch unsynced users and attendance
    const users = await getUnsyncedUsers(siteDetails.last_sync_timestamp);
    const attendance = await getUnsyncedAttendance(siteDetails.last_sync_timestamp);

    const payload = {
      site_id: siteDetails.site_id,
      site_name: siteDetails.site_name,
      users,
      attendance,
    };

    return { success: true, payload };
  } catch (err) {
    console.error("Error preparing local sync data:", err);
    return { success: false, error: "Failed to prepare sync data" };
  }
}

/**
 * Update sync status after attempt
 * Returns { success, message }
 */
async function finalizeSync(success) {
  try {
    const siteDetails = await getSiteDetails();
    if (!siteDetails) {
      return { success: false, error: "Site metadata missing" };
    }

    if (success) {
      // Mark success with current timestamp
      await pool.query(
        "UPDATE site_meta SET last_sync_timestamp = NOW(), sync_status = 'idle' WHERE site_id = ?",
        [siteDetails.site_id]
      );
      return { success: true, message: "Sync finalized successfully" };
    } else {
      // Mark failure
      await pool.query(
        "UPDATE site_meta SET sync_status = 'failed' WHERE site_id = ?",
        [siteDetails.site_id]
      );
      return { success: false, message: "Sync marked as failed" };
    }
  } catch (err) {
    console.error("Error finalizing sync:", err);
    return { success: false, error: "Failed to finalize sync" };
  }
}

export default {
  prepareSyncData,
  finalizeSync,
};
