import { expect, test } from "bun:test";
import { isComputerTypingTarget } from "@/computer/keyboardTarget";

test("computer keyboard boundary accepts window events and protects editing targets", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "HTMLElement");

    class ElementTarget extends EventTarget {
        constructor(
            public tagName: string,
            private editable: string | null = null,
        ) {
            super();
        }
        getAttribute(name: string) {
            return name === "contenteditable" ? this.editable : null;
        }
    }

    Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: ElementTarget });

    try {
        expect(isComputerTypingTarget(new EventTarget())).toBe(false);
        expect(isComputerTypingTarget(null)).toBe(false);
        expect(isComputerTypingTarget(new ElementTarget("INPUT"))).toBe(true);
        expect(isComputerTypingTarget(new ElementTarget("TEXTAREA"))).toBe(true);
        expect(isComputerTypingTarget(new ElementTarget("DIV", "true"))).toBe(true);
        expect(isComputerTypingTarget(new ElementTarget("DIV", "false"))).toBe(false);
        expect(isComputerTypingTarget(new ElementTarget("BUTTON"))).toBe(false);
    } finally {
        if (original) Object.defineProperty(globalThis, "HTMLElement", original);
        else Reflect.deleteProperty(globalThis, "HTMLElement");
    }
});
