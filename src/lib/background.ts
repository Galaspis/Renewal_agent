import { runAlertCheck } from "./alerts";

let started = false;
let busy = false;

async function tick() {
  if (busy) return;
  busy = true;
  try {
    await runAlertCheck();
  } catch {
    // Stay alive if one pass fails.
  } finally {
    busy = false;
  }
}

/** Checks for due renewal alerts shortly after start, then every 15 minutes. */
export function startBackgroundJobs() {
  if (started) return;
  started = true;
  setTimeout(() => {
    void tick();
  }, 8_000);
  setInterval(() => {
    void tick();
  }, 15 * 60 * 1000);
}
