import { expect, test } from "bun:test";
import { decodeCursorCache } from "../src/room/hooks/useCursorColor";

test("cursor cache accepts complete matching values and rejects malformed storage", () => {
    const values = { default: "auto", click: "pointer", drag: "grab", text: "text" };
    expect(decodeCursorCache(JSON.stringify({ color: "red", values }), "red")).toEqual(values);
    expect(decodeCursorCache(JSON.stringify({ color: "blue", values }), "red")).toBeNull();

    for (const raw of [
        "null",
        "broken",
        "[]",
        JSON.stringify({ color: "red", values: null }),
        JSON.stringify({ color: "red", values: { ...values, drag: 7 } }),
        JSON.stringify({ color: "red", values: { default: "auto" } }),
    ]) {
        expect(decodeCursorCache(raw, "red")).toBeNull();
    }
});
