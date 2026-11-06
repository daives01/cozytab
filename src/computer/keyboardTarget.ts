export function isComputerTypingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.getAttribute("contenteditable") === "true")
    );
}
