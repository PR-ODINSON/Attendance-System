import { Router } from "express";
import { loginUser, logoutUser, registerUser, verifySession } from "../controllers/authController.js";
import { upload } from "../middleware/uploadMulter.js";
import authenticateToken from "../middleware/authToken.js";

const authRoutes = Router();

authRoutes.post("/login", loginUser);
authRoutes.post("/logout", logoutUser);
authRoutes.post("/register", upload.array("profilePhotos"), registerUser);
authRoutes.get("/verify-session", authenticateToken, verifySession);

export default authRoutes;
