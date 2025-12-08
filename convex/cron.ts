import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const cron = cronJobs();

const STALE_SCAN_MINUTES = 30;
// Safety net: clear expired leases/rooms in case a heartbeat is missed.
cron.interval("close stale empty rooms", { minutes: STALE_SCAN_MINUTES }, internal.rooms.closeStaleRooms);

export default cron;
