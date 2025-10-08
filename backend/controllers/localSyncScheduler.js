import axios from "axios";
import localSyncController from "./localSyncController.js";

/**
 * Run scheduled sync job
 * - Random delay 0–15 minutes to reduce collisions
 * - Calls localSyncController.prepareSyncData() and finalizeSync()
 */
export async function runScheduledSync() {
  const globalUrl = `${process.env.GLOBAL_SERVER_ORIGIN}/api/global-sync/sync`;

  try {
    // Random delay (0–15 min)
    // const randomDelay = Math.floor(Math.random() * 15 * 60 * 1000);
    const randomDelay = Math.floor(Math.random() * 1 * 1 * 1000);

    console.log(
      `[Scheduler] Waiting ${Math.floor(randomDelay / 1000)}s before starting sync...`
    );
    await new Promise((resolve) => setTimeout(resolve, randomDelay));

    // Step 1: Prepare local payload
    const prepResult = await localSyncController.prepareSyncData();

    if (!prepResult.success) {
      await localSyncController.finalizeSync(false);
      console.error("[Scheduler] Failed to prepare local sync data");
      return;
    }

    const payload = prepResult.payload;

    // No new data → finalize and exit
    if (
      (!payload.users || payload.users.length === 0) &&
      (!payload.attendance || payload.attendance.length === 0)
    ) {
      await localSyncController.finalizeSync(true);
      console.log("[Scheduler] No new data to sync. Marking idle.");
      return;
    }

    // Step 2: Push to global server
    const response = await axios.post(globalUrl, payload, { timeout: 20000 });

    if (response.data.success) {
      await localSyncController.finalizeSync(true);
      console.log(
        `[Scheduler] Sync successful — Users: ${payload.users.length}, Attendance: ${payload.attendance.length}`
      );
    } else {
      await localSyncController.finalizeSync(false);
      console.error("[Scheduler] Global server rejected sync:", response.data);
    }
  } catch (err) {
    await localSyncController.finalizeSync(false);
    console.error("[Scheduler] Error during scheduled sync:", err.message);
  }
}
