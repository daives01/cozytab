import { useRef, useEffect, useState } from "react";

interface CursorAction {
    x: number;
    y: number;
    timeSinceBatchStart: number;
}

interface PresenceCursorProps {
    name: string;
    isOwner: boolean;
    actions: CursorAction[];
}

export function PresenceCursor({ name, isOwner, actions }: PresenceCursorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const batchQueueRef = useRef<CursorAction[][]>([]);
    const currentBatchRef = useRef<CursorAction[] | null>(null);
    const batchStartTimeRef = useRef<number>(0);
    const animationRef = useRef<number | null>(null);
    const lastActionsRef = useRef<CursorAction[]>([]);
    const [displayPos, setDisplayPos] = useState({ x: 960, y: 540 });

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
            if (!containerRef.current) {
                animationRef.current = requestAnimationFrame(animate);
                return;
            }

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
        };
    }, []);

    const cursorColor = isOwner ? "#6366f1" : "#10b981";
    const bgColor = isOwner ? "bg-indigo-500" : "bg-emerald-500";

    return (
        <div
            ref={containerRef}
            className="absolute pointer-events-none"
            style={{
                left: displayPos.x,
                top: displayPos.y,
                zIndex: 100,
                transform: "translate(-2px, -2px)",
                transition: "left 50ms linear, top 50ms linear",
            }}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.3))",
                }}
            >
                <path
                    d="M5 3 L5 17 L9 13 L12 19 L15 18 L12 12 L18 12 L5 3Z"
                    fill={cursorColor}
                    stroke="#1f2937"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>

            <div
                className={`${bgColor} text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md ml-4 -mt-1`}
                style={{
                    fontFamily: "'Patrick Hand', cursive",
                }}
            >
                {name}
                {isOwner && " ★"}
            </div>
        </div>
    );
}
