import { Router } from "express";
import { getAllAdmins } from "../controllers/adminController.js";

const adminRoutes = Router();

adminRoutes.get("/all", getAllAdmins);

export default adminRoutes;
