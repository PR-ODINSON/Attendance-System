import { Router } from "express";
import { getAllEmployees, registerByAdmin, startFaceRecognition } from "../controllers/adminController.js";
import { authenticateToken } from '../middleware/authToken.js';
import { upload } from "../middleware/uploadMulter.js";

const adminRoutes = Router();

adminRoutes.get("/get-all-employees", authenticateToken ,getAllEmployees);
adminRoutes.post("/register-by-admin", authenticateToken, upload.array("profilePhotos"), registerByAdmin);
adminRoutes.post("/start-face-recognition", startFaceRecognition);
export default adminRoutes;
