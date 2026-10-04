import { loadCounts } from "./model";

type PendingHit = {
  type: "hit";
  eventId: string;
  candidateId: string;
  created: number;
};
export function connectScores(
  ids: string[],
  onScores: (counts: Record<string, number>) => void,
  onStatus: (status: string) => void,
) {
  let socket: WebSocket | undefined;
  let attempt = 0;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout>;
  const pending = new Map<string, PendingHit>();
  const send = (hit: PendingHit) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(hit));
  };
  function connect() {
    if (stopped) return;
    onStatus("全站數據連線中…");
    const url = new URL("/api/live", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(url);
    socket.onopen = () => {
      attempt = 0;
      onStatus("全站數據即時同步");
      for (const [id, hit] of pending) {
        if (Date.now() - hit.created > 3600000) pending.delete(id);
        else send(hit);
      }
    };
    socket.onmessage = ({ data }) => {
      if (data === "pong") return;
      try {
        const message = JSON.parse(data);
        if (message.type === "scores")
          onScores(loadCounts(JSON.stringify(message.counts), ids));
        if (message.type === "ack") pending.delete(message.eventId);
      } catch {
        /* Ignore malformed responses. */
      }
    };
    socket.onclose = () => {
      onStatus("全站同步中斷，正在重連；本機仍可玩");
      retry = setTimeout(
        connect,
        Math.min(30000, 1000 * 2 ** attempt++) + Math.random() * 500,
      );
    };
    socket.onerror = () => socket?.close();
  }
  const heartbeat = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
  }, 30000);
  window.addEventListener("pagehide", () => {
    stopped = true;
    clearTimeout(retry);
    clearInterval(heartbeat);
    socket?.close();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });
  connect();
  return (candidateId: string) => {
    // Bound reconnect replay to the server's per-connection burst limit.
    if (pending.size >= 15) {
      onStatus("離線待同步已滿；新增點擊只保留本機");
      return;
    }
    const hit: PendingHit = {
      type: "hit",
      eventId: crypto.randomUUID(),
      candidateId,
      created: Date.now(),
    };
    pending.set(hit.eventId, hit);
    send(hit);
  };
}
