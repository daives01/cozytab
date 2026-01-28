import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const HEARTBEAT_INTERVAL_MS = 60_000; // 60s visible
const HIDDEN_INTERVAL_MS = 90_000;    // 90s when tab hidden

export function usePresenceHeartbeat(enabled: boolean) {
  const heartbeat = useMutation(api.rooms.heartbeatPresence);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const send = () => heartbeat().catch(() => {});

    const setup = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const interval = document.visibilityState === "hidden"
        ? HIDDEN_INTERVAL_MS
        : HEARTBEAT_INTERVAL_MS;
      send();
      intervalRef.current = setInterval(send, interval);
    };

    setup();
    document.addEventListener("visibilitychange", setup);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", setup);
    };
  }, [enabled, heartbeat]);
}
