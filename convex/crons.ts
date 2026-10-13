import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Moves the demo parcels along so the admin panel looks alive. Does nothing without demo data.
crons.interval("demo traffic", { minutes: 1 }, internal.demo.tick, {});

export default crons;
