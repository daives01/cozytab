import { expect, test } from "bun:test";
import { act, create } from "react-test-renderer";
import { ChatInput } from "@/room/ChatInput";

test("chat keyboard listeners handle window event targets without treating them as elements", async () => {
    const originals = ["window", "HTMLElement", "IS_REACT_ACT_ENVIRONMENT"].map(
        (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
    );

    const browser = new EventTarget();

    class HtmlElement extends EventTarget {}

    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
    Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: HtmlElement });
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
    const changes: Array<string | null> = [];
    const renderer = await act(() => create(<ChatInput onMessageChange={(value) => changes.push(value)} />));

    try {
        const enter = Object.assign(new Event("keydown", { cancelable: true }), { key: "Enter" });
        await act(() => {
            browser.dispatchEvent(enter);
        });
        expect(changes).toEqual([""]);
        expect(enter.defaultPrevented).toBe(true);
        await act(() => {
            browser.dispatchEvent(Object.assign(new Event("keyup"), { key: "Enter" }));
        });
        await act(() => {
            browser.dispatchEvent(Object.assign(new Event("keydown"), { key: "Escape" }));
        });
        expect(changes).toEqual(["", null]);
    } finally {
        await act(() => renderer.unmount());

        for (const [name, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    }
});
