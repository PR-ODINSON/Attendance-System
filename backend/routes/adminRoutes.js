import { Router } from "express";
import { 
  getAllEmployees, 
  registerByAdmin, 
  startFaceRecognition,
  updateEmployee,
  deleteEmployee,
  getEmployeeById
} from "../controllers/adminController.js";
import { authenticateToken } from '../middleware/authToken.js';
import { upload } from "../middleware/uploadMulter.js";

const adminRoutes = Router();

adminRoutes.get("/get-all-employees", authenticateToken, getAllEmployees);
adminRoutes.get("/get-employee/:employee_id", authenticateToken, getEmployeeById);
adminRoutes.post("/register-by-admin", authenticateToken, upload.array("profilePhotos"), registerByAdmin);
adminRoutes.put("/update-employee/:employee_id", authenticateToken, upload.array("profilePhotos"), updateEmployee);
adminRoutes.delete("/delete-employee/:employee_id", authenticateToken, deleteEmployee);
adminRoutes.post("/start-face-recognition", startFaceRecognition);

export default adminRoutes;
