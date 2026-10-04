import assert from "node:assert/strict";
import { createRequire } from "node:module";
const WebSocket = createRequire(import.meta.url)("ws");
const base = process.env.SYNC_TEST_URL;
assert.ok(base, "Set SYNC_TEST_URL to the site URL to verify");
const page = await fetch(base);
assert.equal(page.status, 200);
const response = await fetch(base + "/api/scores");
assert.equal(response.status, 200);
assert.equal(response.headers.get("cache-control"), "no-store");
const scores = await response.json();
assert.equal(scores.type, "scores");
const connect = () =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(base.replace(/^https/, "wss") + "/api/live", {
      origin: base,
    });
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Timeout"));
    }, 10000);
    socket.once("message", (data) => {
      clearTimeout(timeout);
      resolve({ socket, snapshot: JSON.parse(String(data)) });
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
const clients = await Promise.all([connect(), connect()]);
for (const client of clients) {
  assert.equal(client.snapshot.type, "scores");
  client.socket.close();
}
assert.equal(
  (
    await fetch(base + "/api/live", {
      headers: { Origin: "https://untrusted.example" },
    })
  ).status,
  403,
);
console.log(
  "PASS: live homepage, uncached API, two WebSocket snapshots, origin restriction (no score writes)",
);
