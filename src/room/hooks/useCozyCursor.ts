import { useEffect } from "react";

export function useCozyCursor(enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        const root = document.documentElement;
        root.classList.add("cozy-cursor-root");

        const CLICKABLE_SELECTOR = "[data-cozy-clickable]";

        const setClickState = (isClickable: boolean) => {
            root.classList.toggle("cozy-cursor-click", isClickable);
        };

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const clickableTarget = target.closest(CLICKABLE_SELECTOR);
            setClickState(Boolean(clickableTarget));
        };

        const handlePointerUp = () => {
            setClickState(false);
            root.classList.remove("cozy-cursor-drag");
        };

        const handleDragStart = () => {
            root.classList.add("cozy-cursor-drag");
        };

        const handleDragEnd = () => {
            root.classList.remove("cozy-cursor-drag");
            setClickState(false);
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("dragstart", handleDragStart);
        window.addEventListener("dragend", handleDragEnd);

        return () => {
            root.classList.remove("cozy-cursor-root");
            root.classList.remove("cozy-cursor-click");
            root.classList.remove("cozy-cursor-drag");
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("dragstart", handleDragStart);
            window.removeEventListener("dragend", handleDragEnd);
        };
    }, [enabled]);
}
