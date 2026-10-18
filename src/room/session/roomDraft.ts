import type { RoomItem } from "@shared/guestTypes";
import type { RoomDraft } from "./types";

const STORAGE_KEY = "cozytab_room_drafts_v1";
const MAX_ROOMS = 10;
const MAX_CHARS = 1_000_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Drafts = Record<string, { updatedAt: number; items: RoomItem[] }>;

// Room IDs are only supplied after loading the signed-in owner's room. Keep a
// small, expiring outbox; never hydrate a different account's/room's draft.
export function createRoomDraft(roomId: string, storage?: Pick<Storage, "getItem" | "setItem">): RoomDraft {
    let checkpointStored = false;
    const getStorage = () => storage ?? globalThis.localStorage;
    const read = (): Drafts | null => {
        try {
            const raw = getStorage().getItem(STORAGE_KEY);
            if (!raw || raw.length > MAX_CHARS) return {};
            const parsed: unknown = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
            return Object.fromEntries(Object.entries(parsed).filter(([, draft]) =>
                draft && typeof draft.updatedAt === "number" &&
                draft.updatedAt > Date.now() - MAX_AGE_MS &&
                Array.isArray(draft.items) && draft.items.every((item: RoomItem) =>
                    item && typeof item.id === "string" && typeof item.catalogItemId === "string" &&
                    Number.isFinite(item.x) && Number.isFinite(item.y)
                )
            ));
        } catch {
            return null;
        }
    };
    const write = (drafts: Drafts) => {
        try {
            const entries = Object.entries(drafts).sort((a, b) =>
                Number(b[0] === roomId) - Number(a[0] === roomId) || b[1].updatedAt - a[1].updatedAt
            ).slice(0, MAX_ROOMS);
            while (entries.length && JSON.stringify(Object.fromEntries(entries)).length > MAX_CHARS) entries.pop();
            getStorage().setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
            return entries.some(([id]) => id === roomId);
        } catch {
            // Storage can be disabled/full. Normal saves still proceed.
            return false;
        }
    };
    return {
        load: () => {
            const items = read()?.[roomId]?.items ?? null;
            checkpointStored = items !== null;
            return items;
        },
        write: (items) => {
            checkpointStored = write({ ...(read() ?? {}), [roomId]: { updatedAt: Date.now(), items } });
        },
        // A detached session must not drain old edits over a replacement
        // session's newer checkpoint (or its already acknowledged save).
        // If checkpointing failed, still attempt the normal navigation save.
        isCurrent: (items) => {
            const drafts = read();
            return !checkpointStored || drafts === null || JSON.stringify(drafts[roomId]?.items) === JSON.stringify(items);
        },
        acknowledge: (items) => {
            const drafts = read() ?? {};
            // An older request/session must not erase a newer pending edit.
            if (JSON.stringify(drafts[roomId]?.items) !== JSON.stringify(items)) return;
            delete drafts[roomId];
            write(drafts);
        },
    };
}
