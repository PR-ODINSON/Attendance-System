/* Use PM2 for starting both threads in Production */


import dotenv from "dotenv";
import cron from "node-cron";
import { runScheduledSync } from "./controllers/localSyncScheduler.js";
// import { initializeAbsentMarking } from "./controllers/attendanceController.js";

dotenv.config();

/**
 * Utility to print timestamped logs (in IST)
 */
function log(message, level = "INFO") {
  const nowIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  console.log(`[${level}] [${nowIST}] ${message}`);
}

log("Sync Worker started successfully");

// Synchronization job
cron.schedule("0 2 * * *", async () => {
  console.log("[Cron] Triggering scheduled sync job at 2 AM");
  await runScheduledSync();
});

// Daily absent marking job 
// cron.schedule("5 0 * * *", async () => {
//   try {
//     log("Starting daily automatic absent marking...");
//     initializeAbsentMarking();
//     log("Absent marking completed successfully");
//   } catch (err) {
//     log(`Absent marking failed: ${err.message}`, "ERROR");
//   }
// });

log("All cron jobs scheduled successfully.");
