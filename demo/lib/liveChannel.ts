// Same-browser interviewer <-> candidate sync for the demo, standing in for
// the real backend. Only works across tabs open on the same machine.
export type LiveMessage = { type: "probe-sent"; flagId: number };

const CHANNEL_NAME = "integrai-demo";

export function publishLive(msg: LiveMessage) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const bc = new BroadcastChannel(CHANNEL_NAME);
  bc.postMessage(msg);
  bc.close();
}

export function subscribeLive(onMessage: (msg: LiveMessage) => void): () => void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return () => {};
  const bc = new BroadcastChannel(CHANNEL_NAME);
  const handler = (e: MessageEvent<LiveMessage>) => onMessage(e.data);
  bc.addEventListener("message", handler);
  return () => {
    bc.removeEventListener("message", handler);
    bc.close();
  };
}
