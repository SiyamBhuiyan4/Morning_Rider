import { cronJobs } from "convex/server";
// import { internal } from "./_generated/api";

const crons = cronJobs();

// Demo traffic cron disabled to conserve Convex invocations and database reads.
// If needed for live presentation with demo data, it can be re-enabled with a conservative interval (e.g., 6 hours):
// crons.interval("demo traffic", { hours: 6 }, internal.demo.tick, {});

export default crons;
