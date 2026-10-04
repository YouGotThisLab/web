import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const WebSocket = require("ws");
const base = process.env.SYNC_TEST_URL || "http://127.0.0.1:8787";
const candidateId = "chiang";
const connect = () =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(base.replace(/^http/, "ws") + "/api/live", {
      origin: base,
    });
    socket.once("message", (data) =>
      resolve({ socket, snapshot: JSON.parse(String(data)) }),
    );
    socket.once("error", reject);
  });
const next = (socket, predicate) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("message", listener);
      reject(new Error("Timed out"));
    }, 5000);
    const listener = (data) => {
      const message = JSON.parse(String(data));
      if (predicate(message)) {
        clearTimeout(timeout);
        socket.off("message", listener);
        resolve(message);
      }
    };
    socket.on("message", listener);
  });
const [a, b] = await Promise.all([connect(), connect()]);
try {
  assert.equal(a.snapshot.type, "scores");
  const previous = a.snapshot.counts[candidateId] || 0;
  const eventId = crypto.randomUUID();
  const hit = JSON.stringify({ type: "hit", eventId, candidateId });
  const broadcast = next(b.socket, (value) => value.type === "scores");
  const ack = next(a.socket, (value) => value.type === "ack");
  a.socket.send(hit);
  const updated = await broadcast;
  await ack;
  assert.equal(updated.counts[candidateId], previous + 1);
  const duplicateAck = next(a.socket, (value) => value.type === "ack");
  a.socket.send(hit);
  await duplicateAck;
  const stored = await (await fetch(base + "/api/scores")).json();
  assert.equal(stored.counts[candidateId], updated.counts[candidateId]);
  const c = await connect();
  assert.equal(c.snapshot.counts[candidateId], updated.counts[candidateId]);
  c.socket.close();
  // The malformed candidate closes the socket without a database write.
  const closed = new Promise((resolve) =>
    b.socket.once("close", (code) => resolve(code)),
  );
  b.socket.send(
    JSON.stringify({
      type: "hit",
      eventId: crypto.randomUUID(),
      candidateId: "unknown",
    }),
  );
  assert.equal(await closed, 1008);
  const response = await fetch(base + "/api/live", {
    headers: { Origin: "https://untrusted.example" },
  });
  assert.equal(response.status, 403);
  assert.equal((await fetch(base + "/")).status, 200);
  console.log(
    "PASS: cross-client broadcast, durable snapshot, reconnect, duplicate protection, invalid candidate, origin restriction, static assets",
  );
} finally {
  a.socket.close();
  b.socket.close();
}
