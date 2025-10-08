import { Router } from "express";
import syncController from "../controllers/globalSyncController.js";

const syncRoutes = Router();

syncRoutes.post("/sync", syncController.receiveSync);

export default syncRoutes;
