import { useMemo, useState } from "react";
import type { RoomItem } from "@shared/guestTypes";
import { isMusicItem } from "../roomUtils";

type MusicState = {
    urlKey: string;
    playing: boolean;
    startedAt: number;
    positionAtStart: number;
};

const musicUrlKey = (item: RoomItem) => `${item.musicType ?? ""}:${item.musicUrl ?? ""}`;

export function useVisitorMusic(items: RoomItem[] | undefined) {
    const [activeMusicItemId, setActiveMusicItemId] = useState<string | null>(null);
    const [visitorMusicOverrides, setVisitorMusicOverrides] = useState<Record<string, MusicState>>({});

    const baseVisitorMusicState = useMemo(() => {
        if (!items) return {};
        const next: Record<string, MusicState> = {};
        for (const item of items) {
            if (!isMusicItem(item)) continue;
            next[item.id] = {
                urlKey: musicUrlKey(item),
                playing: item.musicPlaying ?? false,
                startedAt: item.musicStartedAt ?? 0,
                positionAtStart: item.musicPositionAtStart ?? 0,
            };
        }
        return next;
    }, [items]);

    const visitorMusicState = useMemo(() => {
        const next: Record<string, MusicState> = {};
        for (const [itemId, baseState] of Object.entries(baseVisitorMusicState)) {
            const override = visitorMusicOverrides[itemId];
            const useOverride = override && override.urlKey === baseState.urlKey;
            const wantsPlay = useOverride ? override.playing : true;
            next[itemId] = {
                urlKey: baseState.urlKey,
                playing: baseState.playing && wantsPlay,
                startedAt: baseState.startedAt,
                positionAtStart: baseState.positionAtStart,
            };
        }
        return next;
    }, [baseVisitorMusicState, visitorMusicOverrides]);

    const activeMusicItem = useMemo(() => {
        if (!activeMusicItemId || !items) return null;
        const rawItem = items.find((i) => i.id === activeMusicItemId);
        if (!rawItem) return null;
        const musicState = visitorMusicState[rawItem.id];
        return musicState
            ? { ...rawItem, musicPlaying: musicState.playing, musicStartedAt: musicState.startedAt, musicPositionAtStart: musicState.positionAtStart }
            : rawItem;
    }, [activeMusicItemId, items, visitorMusicState]);

    const handleMusicToggle = (itemId: string, playing: boolean, urlKey?: string) => {
        const hostItem = items?.find((i) => i.id === itemId);
        const hostStartedAt = hostItem?.musicStartedAt ?? 0;
        const hostPositionAtStart = hostItem?.musicPositionAtStart ?? 0;
        setVisitorMusicOverrides((prev) => {
            const existing = prev[itemId] ?? baseVisitorMusicState[itemId];
            const key = urlKey ?? existing?.urlKey ?? "";
            return {
                ...prev,
                [itemId]: {
                    urlKey: key,
                    playing,
                    startedAt: playing ? hostStartedAt : 0,
                    positionAtStart: hostPositionAtStart,
                },
            };
        });
    };

    return {
        visitorMusicState,
        activeMusicItem,
        activeMusicItemId,
        setActiveMusicItemId,
        handleMusicToggle,
        musicUrlKey,
    };
}
