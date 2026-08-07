/* global console, process, setTimeout */

import { spawn } from "node:child_process";

const processes = [
  {
    name: "web",
    command: "pnpm",
    args: ["exec", "next", "start", "-p", process.env.PORT ?? "3000"]
  },
  {
    name: "worker",
    command: "pnpm",
    args: ["worker"]
  }
];

const children = new Map();
let shuttingDown = false;
let finalExitCode = 0;

function stopAll(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  finalExitCode = exitCode;

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
    shell: true,
    stdio: "inherit"
  });

  children.set(definition.name, child);

  child.on("exit", (code, signal) => {
    children.delete(definition.name);

    if (!shuttingDown) {
      const exitCode = code ?? 1;
      console.error(`${definition.name} exited unexpectedly`, { code, signal });
      stopAll(exitCode === 0 ? 1 : exitCode);
      return;
    }

    if (children.size === 0) {
      process.exit(finalExitCode);
    }
  });

  child.on("error", (error) => {
    console.error(`${definition.name} failed to start`, error);
    stopAll(1);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

for (const definition of processes) {
  startProcess(definition);
}
