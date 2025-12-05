import { useEffect } from "react";

export function useCozyCursor(enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        const root = document.documentElement;
        root.classList.add("cozy-cursor-root");

        const handlePointerDown = () => {
            root.classList.add("cozy-cursor-click");
        };
        const handlePointerUp = () => {
            root.classList.remove("cozy-cursor-click");
            root.classList.remove("cozy-cursor-drag");
        };
        const handleDragStart = () => {
            root.classList.add("cozy-cursor-drag");
        };
        const handleDragEnd = () => {
            root.classList.remove("cozy-cursor-drag");
            root.classList.remove("cozy-cursor-click");
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
