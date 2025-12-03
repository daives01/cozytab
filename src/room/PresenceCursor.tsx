import { useRef, useEffect, useState } from "react";
import { CursorDisplay } from "./CursorDisplay";

interface CursorAction {
    x: number;
    y: number;
    timeSinceBatchStart: number;
    text?: string;
}

interface PresenceCursorProps {
    name: string;
    isOwner: boolean;
    actions: CursorAction[];
}

const CHAT_DISPLAY_DURATION_MS = 3000;
const CHAT_FADE_DURATION_MS = 500;

export function PresenceCursor({ name, isOwner, actions }: PresenceCursorProps) {
    const batchQueueRef = useRef<CursorAction[][]>([]);
    const currentBatchRef = useRef<CursorAction[] | null>(null);
    const batchStartTimeRef = useRef<number>(0);
    const animationRef = useRef<number | null>(null);
    const lastActionsRef = useRef<CursorAction[]>([]);
    
    const [displayPos, setDisplayPos] = useState({ x: 960, y: 540 });
    const [displayedText, setDisplayedText] = useState<string | null>(null);
    const [chatOpacity, setChatOpacity] = useState(1);
    
    const lastTextRef = useRef<string | null>(null);
    const textClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (actions === lastActionsRef.current) return;
        if (actions.length === 0) return;
        
        const lastActions = lastActionsRef.current;
        if (
            lastActions.length === actions.length &&
            lastActions[0]?.x === actions[0]?.x &&
            lastActions[0]?.y === actions[0]?.y &&
            lastActions[0]?.timeSinceBatchStart === actions[0]?.timeSinceBatchStart
        ) {
            return;
        }

        lastActionsRef.current = actions;
        batchQueueRef.current.push([...actions]);
    }, [actions]);

    useEffect(() => {
        const animate = () => {
            if (currentBatchRef.current === null) {
                if (batchQueueRef.current.length === 0) {
                    animationRef.current = requestAnimationFrame(animate);
                    return;
                }

                currentBatchRef.current = batchQueueRef.current.shift()!;
                batchStartTimeRef.current = Date.now();
            }

            const elapsed = Date.now() - batchStartTimeRef.current;
            const currentBatch = currentBatchRef.current;

            while (currentBatch.length > 0) {
                const action = currentBatch[0];
                if (Math.min(action.timeSinceBatchStart, 1000) > elapsed) break;

                currentBatch.shift();
                setDisplayPos({ x: action.x, y: action.y });
                
                if (action.text !== undefined && action.text !== lastTextRef.current) {
                    lastTextRef.current = action.text;
                    setDisplayedText(action.text);
                    setChatOpacity(1);
                    
                    if (textClearTimeoutRef.current) {
                        clearTimeout(textClearTimeoutRef.current);
                        textClearTimeoutRef.current = null;
                    }
                } else if (action.text === undefined && lastTextRef.current !== null) {
                    if (!textClearTimeoutRef.current) {
                        textClearTimeoutRef.current = setTimeout(() => {
                            setChatOpacity(0);
                            setTimeout(() => {
                                setDisplayedText(null);
                                lastTextRef.current = null;
                            }, CHAT_FADE_DURATION_MS);
                            textClearTimeoutRef.current = null;
                        }, CHAT_DISPLAY_DURATION_MS);
                    }
                }
            }

            if (currentBatch.length === 0) {
                currentBatchRef.current = null;
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (textClearTimeoutRef.current) {
                clearTimeout(textClearTimeoutRef.current);
            }
        };
    }, []);

    return (
        <CursorDisplay
            name={name}
            isOwner={isOwner}
            x={displayPos.x}
            y={displayPos.y}
            chatMessage={displayedText}
            chatOpacity={chatOpacity}
            showNameBadge={true}
        />
    );
}
