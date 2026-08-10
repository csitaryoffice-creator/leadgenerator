/* global clearTimeout, console, process, setTimeout */

import { spawn } from "node:child_process";

const processes = [
  {
    name: "web",
    command: process.execPath,
    args: ["--max-old-space-size=256", "node_modules/next/dist/bin/next", "start", "-p", process.env.PORT ?? "3000"]
  },
  {
    name: "worker",
    command: process.execPath,
    args: ["--max-old-space-size=192", "node_modules/tsx/dist/cli.mjs", "src/worker.ts"]
  }
];

const children = new Map();
const restartTimers = new Map();
const workerRestartDelayMs = 5000;
let shuttingDown = false;
let finalExitCode = 0;

function clearRestartTimers() {
  for (const timer of restartTimers.values()) {
    clearTimeout(timer);
  }
  restartTimers.clear();
}

function scheduleWorkerRestart(definition) {
  if (shuttingDown || restartTimers.has(definition.name)) {
    return;
  }

  const timer = setTimeout(() => {
    restartTimers.delete(definition.name);

    if (!shuttingDown) {
      console.error("restarting worker after failure");
      startProcess(definition);
    }
  }, workerRestartDelayMs);

  restartTimers.set(definition.name, timer);
}

function stopAll(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  finalExitCode = exitCode;
  clearRestartTimers();

  for (const child of children.values()) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    for (const child of children.values()) {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
    process.exit(finalExitCode);
  }, 10000).unref();

  if (children.size === 0) {
    process.exit(finalExitCode);
  }
}

function startProcess(definition) {
  const child = spawn(definition.command, definition.args, {
    env: process.env,
    shell: false,
    stdio: "inherit"
  });

  children.set(definition.name, child);

  child.on("exit", (code, signal) => {
    children.delete(definition.name);

    if (!shuttingDown) {
      const exitCode = code ?? 1;
      console.error(`${definition.name} exited unexpectedly`, { code, signal });

      if (definition.name === "worker") {
        scheduleWorkerRestart(definition);
        return;
      }

      stopAll(exitCode === 0 ? 1 : exitCode);
      return;
    }

    if (children.size === 0) {
      process.exit(finalExitCode);
    }
  });

  child.on("error", (error) => {
    console.error(`${definition.name} failed to start`, error);

    if (definition.name === "worker") {
      scheduleWorkerRestart(definition);
      return;
    }

    stopAll(1);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

for (const definition of processes) {
  startProcess(definition);
}
