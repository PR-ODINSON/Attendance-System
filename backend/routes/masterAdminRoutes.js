import express from "express";
import { getGlobalOverview, getAllSites, getSiteAdmins, getAttendanceBySite, getUsersBySite, getFullSiteData } from "../controllers/masterAdminController.js";
import { authenticateToken } from '../middleware/authToken.js';

const masterAdminRoutes = express.Router();


// Routes
masterAdminRoutes.get("/overview", authenticateToken, getGlobalOverview);
masterAdminRoutes.get("/sites", authenticateToken, getAllSites);
masterAdminRoutes.get("/sites/:siteId/admins", authenticateToken, getSiteAdmins);
masterAdminRoutes.get("/sites/:siteId/users", authenticateToken, getUsersBySite);
masterAdminRoutes.get("/sites/:siteId/attendance", authenticateToken, getAttendanceBySite);
masterAdminRoutes.get("/sites/:siteId/details", authenticateToken, getFullSiteData);

export default masterAdminRoutes;
