import { DurableObject } from "cloudflare:workers";
import { candidates } from "../src/data";
import { rollHit } from "../src/model";

type Env = { SCORES: DurableObjectNamespace; ASSETS: Fetcher };
type Hit = { type: "hit"; eventId: string; candidateId: string };
const validIds = new Set(candidates.map((candidate) => candidate.id));
export function validHit(value: unknown): value is Hit {
  if (!value || typeof value !== "object") return false;
  const hit = value as Hit;
  return (
    hit.type === "hit" &&
    validIds.has(hit.candidateId) &&
    typeof hit.eventId === "string" &&
    /^[a-f0-9-]{36}$/.test(hit.eventId)
  );
}

export class Scores extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS scores (id TEXT PRIMARY KEY, points INTEGER NOT NULL)",
    );
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, created INTEGER NOT NULL)",
    );
    ctx.storage.sql.exec(
      "CREATE INDEX IF NOT EXISTS event_time ON events(created)",
    );
    ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }
  snapshot() {
    const rows = this.ctx.storage.sql
      .exec<{ id: string; points: number }>("SELECT id, points FROM scores")
      .toArray();
    return {
      type: "scores",
      counts: Object.fromEntries(rows.map((row) => [row.id, row.points])),
    };
  }
  async fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json(this.snapshot(), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (this.ctx.getWebSockets().length >= 200)
      return new Response("Busy", { status: 503 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      lastHit: 0,
      combo: 0,
      window: Date.now(),
      hits: 0,
    });
    server.send(JSON.stringify(this.snapshot()));
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > 512) {
      socket.close(1008, "Invalid message");
      return;
    }
    let hit: unknown;
    try {
      hit = JSON.parse(message);
    } catch {
      socket.close(1008, "Invalid JSON");
      return;
    }
    if (!validHit(hit)) {
      socket.close(1008, "Invalid hit");
      return;
    }
    const now = Date.now();
    const state = socket.deserializeAttachment();
    if (now - state.window >= 1000) {
      state.window = now;
      state.hits = 0;
    }
    if (++state.hits > 20) {
      socket.close(1008, "Too many hits");
      return;
    }
    socket.serializeAttachment(state);
    const duplicate = this.ctx.storage.sql
      .exec("SELECT id FROM events WHERE id = ?", hit.eventId)
      .toArray().length;
    if (!duplicate) {
      state.combo = now - state.lastHit < 650 ? state.combo + 1 : 1;
      state.lastHit = now;
      socket.serializeAttachment(state);
      const points = rollHit(state.combo).points;
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec(
          "INSERT INTO events (id, created) VALUES (?, ?)",
          hit.eventId,
          now,
        );
        this.ctx.storage.sql.exec(
          "INSERT INTO scores (id, points) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET points = MIN(points + excluded.points, 9007199254740991)",
          hit.candidateId,
          points,
        );
        // Retries are supported for 24 hours, including across object restarts.
        this.ctx.storage.sql.exec(
          "DELETE FROM events WHERE created < ?",
          now - 86400000,
        );
      });
      const snapshot = JSON.stringify(this.snapshot());
      for (const client of this.ctx.getWebSockets()) {
        try {
          client.send(snapshot);
        } catch {
          client.close(1011, "Reconnect");
        }
      }
    }
    socket.send(JSON.stringify({ type: "ack", eventId: hit.eventId }));
  }
  webSocketClose(socket: WebSocket, code: number) {
    socket.close([1005, 1006, 1015].includes(code) ? 1000 : code, "Closed");
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/scores" || url.pathname === "/api/live") {
      if (request.method !== "GET")
        return new Response("Method not allowed", { status: 405 });
      if (url.pathname === "/api/live") {
        if (request.headers.get("Origin") !== url.origin)
          return new Response("Forbidden", { status: 403 });
        if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
          return new Response("WebSocket required", { status: 426 });
      }
      const id = env.SCORES.idFromName("global-v1");
      return env.SCORES.get(id, { locationHint: "apac-ne" }).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
