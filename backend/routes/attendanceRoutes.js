import { Router } from "express";
import {
    getMyAttendance,
    getFilteredAttendance,
    getAllAttendance,
    getEmployeeAttendance,
    getEmployeeAttendanceWithUser,
    getBarAttendance,
    markAttendance,
    getSessionStatistics,
    getSessionDetails
} from "../controllers/attendanceController.js";
import { authenticateToken } from "../middleware/authToken.js";

const attendanceRoutes = Router();

attendanceRoutes.get("/get-user-attendance", authenticateToken, getMyAttendance);
attendanceRoutes.get("/get-filtered-attendance", authenticateToken, getFilteredAttendance);
attendanceRoutes.get("/all", authenticateToken, getAllAttendance);
attendanceRoutes.get("/employee/:employeeId", authenticateToken, getEmployeeAttendance);
attendanceRoutes.get("/admin/:employeeId", authenticateToken, getEmployeeAttendanceWithUser);
// attendanceRoutes.get("/bar/attendance", authenticateToken, getBarAttendance);
attendanceRoutes.post("/mark-attendance", markAttendance);  // No auth required for face recognition

// New endpoints for session statistics and details
attendanceRoutes.get("/session-statistics", authenticateToken, getSessionStatistics);
attendanceRoutes.get("/session-details/:employeeId", authenticateToken, getSessionDetails);

export default attendanceRoutes;
