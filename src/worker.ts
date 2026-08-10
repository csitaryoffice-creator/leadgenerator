import { pathToFileURL } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimSearchTask, processSearchTask } from "@/lib/search/jobs";
import { log } from "@/lib/logger";

const idleMs = 3000;

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
  return runWorker(createAdminClient());
}

export async function runWorker(client: SupabaseClient) {
  log("info", "Leadgyűjtő worker elindult.");

  while (!shuttingDown) {
    try {
      const task = await claimSearchTask(client);

      if (!task) {
        await sleep(idleMs);
        continue;
      }

      await processSearchTask(client, task);
    } catch (error) {
      log(
        "error",
        "A worker ciklusa hibába futott; újrapróbálkozás következik.",
        { error }
      );
      await sleep(idleMs);
    }
  }

  log("info", "Leadgyűjtő worker leáll.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
  log("error", "Worker végzetes hibával leállt.", { error });
    process.exit(1);
  });
}
