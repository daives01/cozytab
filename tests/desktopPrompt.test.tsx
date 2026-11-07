import { expect, test } from "bun:test";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { InlineAddPrompt } from "../src/computer/InlineAddPrompt";
import { stubGlobal } from "./stubGlobal";

test("typing an add URL preserves focus and selection until a new prompt opens", async () => {
    let selections = 0;
    const restoreFrame = stubGlobal("requestAnimationFrame", (callback: () => void) => {
        callback();
        return 1;
    });
    const restoreAct = stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let renderer: ReactTestRenderer | undefined;
    const prompt = { x: 10, y: 20, row: 1, col: 2 };
    const render = (url: string, open = true) => (
        <InlineAddPrompt
            prompt={open ? { ...prompt } : null}
            url={url}
            onChange={() => {}}
            onAdd={() => {}}
            onCancel={() => {}}
        />
    );
    try {
        await act(() => {
            renderer = create(render(""), {
                createNodeMock: () => ({
                    focus() {},
                    select() {
                        selections++;
                    },
                }),
            });
        });
        expect(selections).toBe(1);
        await act(() => renderer!.update(render("e")));
        await act(() => renderer!.update(render("example.com")));
        expect(selections).toBe(1);
        expect(renderer!.root.findByType("input").props.value).toBe("example.com");
        await act(() => renderer!.update(render("", false)));
        await act(() => renderer!.update(render("")));
        expect(selections).toBe(2);
    } finally {
        await act(() => renderer?.unmount());
        restoreFrame();
        restoreAct();
    }
});
