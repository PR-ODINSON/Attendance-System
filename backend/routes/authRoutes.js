import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/authController.js";
import { upload } from "../middleware/uploadMulter.js";

const authRoutes = Router();

authRoutes.post("/login", loginUser);
authRoutes.post("/logout", logoutUser);
authRoutes.post("/register", upload.array("profilePhotos"), registerUser);

export default authRoutes;
