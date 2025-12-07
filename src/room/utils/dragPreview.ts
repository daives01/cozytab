import type React from "react";

/**
 * Sets a custom drag image based on a provided element.
 * Falls back silently if drawing fails.
 */
export function setDragImageFromElement(event: React.DragEvent, element: HTMLElement | null) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;
    const dpr = window.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
        ctx.scale(dpr, dpr);
        ctx.drawImage(element as HTMLImageElement, 0, 0, width, height);
        document.body.appendChild(canvas);
        event.dataTransfer.setDragImage(canvas, width / 2, height / 2);
    } catch {
        // Best-effort; ignore failures.
    } finally {
        requestAnimationFrame(() => {
            if (canvas.parentElement) {
                canvas.parentElement.removeChild(canvas);
            }
        });
    }
}
