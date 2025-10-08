import pool from "../database.js";

/**
 * ✅ Fetch all sites with summary info (admins + users + last sync)
 */
export async function getAllSites(req, res) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT 
        s.site_id,
        s.site_name,
        s.setup_date,
        s.last_sync_timestamp,
        COUNT(DISTINCT u.id) AS total_users,
        SUM(CASE WHEN LOWER(u.designation) = 'admin' THEN 1 ELSE 0 END) AS total_admins
      FROM sites s
      LEFT JOIN users u ON s.site_id = u.site_id
      GROUP BY s.site_id
      ORDER BY s.setup_date DESC;
    `);

    res.json({ success: true, sites: rows });
  } catch (err) {
    console.error("Error fetching all sites:", err);
    res.status(500).json({ success: false, error: "Failed to fetch sites" });
  } finally {
    connection.release();
  }
}

/**
 * ✅ Fetch admins for a specific site
 */
export async function getSiteAdmins(req, res) {
  const { siteId } = req.params;
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `
      SELECT 
        employee_id, name, email, phone, department, designation, profilePhoto, created_at
      FROM users
      WHERE site_id = ? AND LOWER(designation) = 'admin'
      ORDER BY name ASC;
      `,
      [siteId]
    );

    res.json({ success: true, admins: rows });
  } catch (err) {
    console.error("Error fetching site admins:", err);
    res.status(500).json({ success: false, error: "Failed to fetch admins" });
  } finally {
    connection.release();
  }
}

/**
 * ✅ Fetch all users of a specific site
 */
export async function getUsersBySite(req, res) {
  const { siteId } = req.params;
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `
      SELECT 
        employee_id, name, email, phone, department, designation, profilePhoto, created_at, updated_at
      FROM users
      WHERE site_id = ?
      ORDER BY name ASC;
      `,
      [siteId]
    );

    res.json({ success: true, users: rows });
  } catch (err) {
    console.error("Error fetching users by site:", err);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  } finally {
    connection.release();
  }
}

/**
 * ✅ Fetch attendance for a specific site within a date range
 */
export async function getAttendanceBySite(req, res) {
  const { siteId } = req.params;
  const { from, to } = req.query;
  const connection = await pool.getConnection();

  try {
    let query = `
      SELECT 
        a.employee_id,
        u.name,
        u.department,
        u.designation,
        a.date,
        a.check_in_time,
        a.check_out_time,
        a.status
      FROM attendance a
      JOIN users u ON a.site_id = u.site_id AND a.employee_id = u.employee_id
      WHERE a.site_id = ?
    `;

    const params = [siteId];

    if (from && to) {
      query += " AND a.date BETWEEN ? AND ?";
      params.push(from, to);
    }

    query += " ORDER BY a.date DESC, u.name ASC;";

    const [rows] = await connection.query(query, params);
    res.json({ success: true, attendance: rows });
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ success: false, error: "Failed to fetch attendance" });
  } finally {
    connection.release();
  }
}

/**
 * ✅ Fetch full site details (site info, admins, users, attendance)
 */
export async function getFullSiteData(req, res) {
  const { siteId } = req.params;
  const connection = await pool.getConnection();

  try {
    // Step 1: Fetch site info
    const [[siteInfo]] = await connection.query(
      "SELECT * FROM sites WHERE site_id = ?",
      [siteId]
    );

    if (!siteInfo) {
      return res.status(404).json({ success: false, error: "Site not found" });
    }

    // Step 2: Run all queries in parallel for performance
    const [adminsPromise, userCountPromise, attendanceCountPromise] = await Promise.all([
      connection.query(
        `SELECT employee_id, name, email, phone, department, designation, profilePhoto
         FROM users
         WHERE site_id = ? AND LOWER(designation) = 'admin'`,
        [siteId]
      ),
      connection.query(
        `SELECT COUNT(*) AS total_users
         FROM users
         WHERE site_id = ?`,
        [siteId]
      ),
      connection.query(
        `SELECT COUNT(*) AS total_attendance
         FROM attendance
         WHERE site_id = ?`,
        [siteId]
      ),
    ]);

    const admins = adminsPromise[0];
    const [{ total_users }] = userCountPromise[0];
    const [{ total_attendance }] = attendanceCountPromise[0];

    // Step 3: Send summarized response
    res.json({
      success: true,
      site: siteInfo,
      admins,
      stats: {
        total_users,
        total_attendance,
      },
    });
  } catch (err) {
    console.error("Error fetching site summary:", err);
    res.status(500).json({ success: false, error: "Failed to fetch site summary" });
  } finally {
    connection.release();
  }
}

/**
 * ✅ Get global overview stats for dashboard (optional but useful)
 */
export async function getGlobalOverview(req, res) {
  const connection = await pool.getConnection();
  try {
    const [[summary]] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM sites) AS total_sites,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE LOWER(designation) = 'admin') AS total_admins,
        (SELECT COUNT(*) FROM attendance) AS total_attendance
    `);

    res.json({ success: true, overview: summary });
  } catch (err) {
    console.error("Error fetching overview:", err);
    res.status(500).json({ success: false, error: "Failed to fetch overview" });
  } finally {
    connection.release();
  }
}

export default {
  getAllSites,
  getSiteAdmins,
  getUsersBySite,
  getAttendanceBySite,
  getFullSiteData,
  getGlobalOverview,
};
