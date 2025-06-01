import { Router } from "express";
import authenticateToken from "../middleware/authToken.js";
import {
  getUserName,
  getUserProfilePhoto,
  getUserDetails,
  updateUserDetails,
  getUserAttendance
} from "../controllers/userController.js";

const userRoutes = Router();

userRoutes.get("/get-user-name", authenticateToken, getUserName);
userRoutes.get("/profilePhoto", authenticateToken, getUserProfilePhoto);
userRoutes.get("/get-user-details", authenticateToken, getUserDetails);
userRoutes.patch("/update-details", authenticateToken, updateUserDetails);
userRoutes.get("/get-user-attendance", authenticateToken, getUserAttendance);

export default userRoutes;
