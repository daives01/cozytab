import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type RefObject,
} from "react";
import { createId } from "@/utils/id";
import type { ComputerWindowApp } from "./types";
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH, WINDOW_DEFAULTS } from "./desktopUtils";

export interface ComputerWindow {
    id: string;
    app: ComputerWindowApp;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    z: number;
}

export interface WindowBounds {
    width: number;
    height: number;
}

export function clampWindowToBounds<T extends ComputerWindow>(window: T, bounds: WindowBounds): T {
    const width = Math.min(Math.max(MIN_WINDOW_WIDTH, window.width), bounds.width);
    const height = Math.min(Math.max(MIN_WINDOW_HEIGHT, window.height), bounds.height);

    return {
        ...window,
        width,
        height,
        x: Math.min(Math.max(0, window.x), Math.max(0, bounds.width - width)),
        y: Math.min(Math.max(0, window.y), Math.max(0, bounds.height - height)),
    };
}

const WINDOW_TITLES: Record<ComputerWindowApp, string> = {
    shop: "Shop",
    rooms: "My Rooms",
    about: "About Cozytab",
    customize: "Customize",
    friends: "Friends",
};

export function useWindowManager({
    desktopRef,
    onPointerMove,
    onShopOpened,
}: {
    desktopRef: RefObject<HTMLDivElement | null>;
    onPointerMove: (clientX: number, clientY: number) => void;
    onShopOpened?: () => void;
}) {
    const [windows, setWindows] = useState<ComputerWindow[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const windowsRef = useRef<ComputerWindow[]>([]);
    const zCounterRef = useRef(1);

    const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(
        null,
    );

    const resizeRef = useRef<{ id: string; startX: number; startY: number; originW: number; originH: number } | null>(
        null,
    );

    useEffect(() => {
        windowsRef.current = windows;
    }, [windows]);
    const getBounds = useCallback(() => desktopRef.current?.getBoundingClientRect() ?? null, [desktopRef]);

    const clampWindow = useCallback(
        <T extends ComputerWindow>(window: T) => {
            const bounds = getBounds();

            return bounds ? clampWindowToBounds(window, bounds) : window;
        },
        [getBounds],
    );

    const bringToFront = useCallback((id: string) => {
        const z = ++zCounterRef.current;
        setWindows((current) => current.map((window) => (window.id === id ? { ...window, z } : window)));
        setActiveWindowId(id);
    }, []);

    const openWindow = useCallback(
        (app: ComputerWindowApp) => {
            const existing = windowsRef.current.find((window) => window.app === app);

            if (existing) {
                bringToFront(existing.id);

                if (app === "shop") onShopOpened?.();

                return;
            }

            const bounds = getBounds();
            const defaults = WINDOW_DEFAULTS[app];
            const fullDesktop = app === "shop";

            const width = bounds
                ? fullDesktop
                    ? bounds.width
                    : Math.min(defaults.width, bounds.width - 16)
                : defaults.width;

            const height = bounds
                ? fullDesktop
                    ? bounds.height
                    : Math.min(defaults.height, bounds.height - 16)
                : defaults.height;

            const z = ++zCounterRef.current;

            const window = clampWindow({
                id: createId(),
                app,
                title: WINDOW_TITLES[app],
                width,
                height,
                z,
                x: bounds ? (fullDesktop ? 0 : Math.max(8, (bounds.width - width) / 2)) : 40,
                y: bounds ? (fullDesktop ? 0 : Math.max(8, (bounds.height - height) / 2)) : 40,
            });

            setWindows((current) => [...current, window]);
            setActiveWindowId(window.id);

            if (app === "shop") onShopOpened?.();
        },
        [bringToFront, clampWindow, getBounds, onShopOpened],
    );

    const closeWindow = useCallback((id: string) => {
        setWindows((current) => current.filter((window) => window.id !== id));
        setActiveWindowId((current) => (current === id ? null : current));

        if (dragRef.current?.id === id) dragRef.current = null;

        if (resizeRef.current?.id === id) resizeRef.current = null;
    }, []);

    const startDragWindow = useCallback(
        (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
            const window = windowsRef.current.find((candidate) => candidate.id === id);

            if (!window) return;
            bringToFront(id);
            dragRef.current = {
                id,
                startX: event.clientX,
                startY: event.clientY,
                originX: window.x,
                originY: window.y,
            };
            event.preventDefault();
        },
        [bringToFront],
    );

    const startResizeWindow = useCallback(
        (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
            const window = windowsRef.current.find((candidate) => candidate.id === id);

            if (!window) return;
            bringToFront(id);
            resizeRef.current = {
                id,
                startX: event.clientX,
                startY: event.clientY,
                originW: window.width,
                originH: window.height,
            };
            event.preventDefault();
        },
        [bringToFront],
    );

    useEffect(() => {
        const handleMove = (event: PointerEvent) => {
            const drag = dragRef.current;
            const resize = resizeRef.current;

            if (!drag && !resize) return;
            setWindows((current) =>
                current.map((window) => {
                    if (drag?.id === window.id)
                        return clampWindow({
                            ...window,
                            x: drag.originX + event.clientX - drag.startX,
                            y: drag.originY + event.clientY - drag.startY,
                        });

                    if (resize?.id === window.id)
                        return clampWindow({
                            ...window,
                            width: resize.originW + event.clientX - resize.startX,
                            height: resize.originH + event.clientY - resize.startY,
                        });

                    return window;
                }),
            );
            onPointerMove(event.clientX, event.clientY);
        };

        const stop = () => {
            dragRef.current = null;
            resizeRef.current = null;
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", stop);

        return () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", stop);
        };
    }, [clampWindow, onPointerMove]);

    return { windows, activeWindowId, openWindow, closeWindow, bringToFront, startDragWindow, startResizeWindow };
}
