#!/usr/bin/env node
import { execSync } from "node:child_process";
import readline from "node:readline";

const args = process.argv.slice(2);
const isProd = args.includes("--prod");
const positional = args.filter((a) => !a.startsWith("--"));

async function promptPasscode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question("Enter admin passcode to set: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  let passcode = positional[0];
  if (!passcode) {
    if (process.stdin.isTTY) {
      passcode = await promptPasscode();
    }
  }

  if (!passcode) {
    console.error("\n❌ Error: No passcode provided.\n");
    console.log("Usage:");
    console.log("  npm run admin:setup -- <passcode>             (development)");
    console.log("  npm run admin:setup:prod -- <passcode>        (production)\n");
    console.log("Examples:");
    console.log("  npm run admin:setup -- 123456");
    console.log("  npm run admin:setup:prod -- MySecretPass2026\n");
    process.exit(1);
  }

  const targetEnv = isProd ? "production" : "development";
  console.log(`\n🔑 Setting admin passcode on Convex (${targetEnv})...`);

  const prodFlag = isProd ? "--prod " : "";
  const payload = JSON.stringify({ passcode });

  try {
    execSync(`npx convex run ${prodFlag}auth:setAdminPasscode '${payload}'`, {
      stdio: "inherit",
    });
    console.log(`\n✅ Success! Admin passcode set for ${targetEnv}.`);
    console.log("You can now sign in at the admin portal (/admin) using this passcode.\n");
  } catch (err) {
    console.error(`\n❌ Failed to set admin passcode.`);
    console.error("Make sure your Convex project is linked (`npx convex dev` or `npx convex login`).\n");
    process.exit(1);
  }
}

main();
