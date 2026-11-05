import { useCallback, useEffect, useRef } from "react";
import type { PresenceVisitor } from "@shared/presenceProtocol";
import { playKeyDown, playKeyUp } from "@/lib/typingAudio";
import { isAudioUnlocked } from "@/lib/audio";
import { isKeyboardSoundEnabled } from "@/hooks/useKeyboardSoundSetting";

export const REMOTE_KEYUP_MIN_DELAY_MS = 45;
export const REMOTE_KEYUP_MAX_DELAY_MS = 100;

export function useRemoteTypingAudio(visitorsRef: React.RefObject<PresenceVisitor[]>) {
    const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

    const queue = useCallback(
        (senderId: string, nextText: string | null) => {
            if (!isKeyboardSoundEnabled() || !isAudioUnlocked() || nextText === null) return;

            const previousText =
                visitorsRef.current.find((visitor) => visitor.visitorId === senderId)?.chatMessage ?? "";

            if (nextText.length <= previousText.length) return;

            for (const character of nextText.slice(previousText.length)) {
                const key = character === " " ? " " : character;
                playKeyDown(key);

                const delay =
                    REMOTE_KEYUP_MIN_DELAY_MS + Math.random() * (REMOTE_KEYUP_MAX_DELAY_MS - REMOTE_KEYUP_MIN_DELAY_MS);

                timeoutsRef.current.push(setTimeout(() => playKeyUp(key), delay));
            }
        },
        [visitorsRef],
    );

    useEffect(
        () => () => {
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];
        },
        [],
    );

    return queue;
}
