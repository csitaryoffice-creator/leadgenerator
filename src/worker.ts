import { createAdminClient } from "@/lib/supabase/admin";
import { claimSearchTask, processSearchTask } from "@/lib/search/jobs";
import { log } from "@/lib/logger";

const idleMs = 3000;
const client = createAdminClient();

let shuttingDown = false;

process.on("SIGINT", () => {
  shuttingDown = true;
});

process.on("SIGTERM", () => {
  shuttingDown = true;
});

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  log("info", "Leadgyűjtő worker elindult.");

  while (!shuttingDown) {
    const task = await claimSearchTask(client);
    if (!task) {
      await sleep(idleMs);
      continue;
    }

    await processSearchTask(client, task);
  }

  log("info", "Leadgyűjtő worker leáll.");
}

main().catch((error) => {
  log("error", "Worker végzetes hibával leállt.", { error });
  process.exit(1);
});
