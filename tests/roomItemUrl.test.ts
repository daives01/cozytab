import { describe, expect, mock, test } from "bun:test";
import { normalizeRoomItemUrl } from "../shared/roomItemUrl";
import { openRoomItemLink } from "../src/room/roomItemLink";

const invalidUrls = [
    "",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "vbscript:msgbox(1)",
    "mailto:hi@example.com",
    "https://",
    "https://exa mple.com",
    "https://example.com/\nfoo",
    "https://example.com/\tfoo",
    "java\nscript:alert(1)",
    "https://example.com/\0foo",
    "https://example.com:99999",
    "https://[invalid]",
    "a".repeat(2049),
    `https://example.com/${"é".repeat(400)}`,
];

describe("room item URL safety", () => {
    test("normalizes HTTP(S) URLs and bare hostnames", () => {
        expect(normalizeRoomItemUrl("example.com/path")).toBe("https://example.com/path");
        expect(normalizeRoomItemUrl(" https://youtube.com/watch?v=abc ")).toBe("https://youtube.com/watch?v=abc");
        expect(normalizeRoomItemUrl("http://example.com")).toBe("http://example.com/");
        expect(normalizeRoomItemUrl("HTTPS://EXAMPLE.COM/a?q=one#two")).toBe("https://example.com/a?q=one#two");
        expect(normalizeRoomItemUrl("https://youtu.be/abc?t=20")).toBe("https://youtu.be/abc?t=20");
    });

    test("rejects malformed URLs and every non-HTTP(S) scheme", () => {
        for (const value of invalidUrls) {
            expect(normalizeRoomItemUrl(value)).toBeUndefined();
        }
    });

    test("accepted links remain valid after normalization and saving", () => {
        for (const value of ["example.com", "https://example.com/é", `https://example.com/${"a".repeat(2028)}`]) {
            const url = normalizeRoomItemUrl(value);
            expect(url).toBeDefined();
            expect(normalizeRoomItemUrl(url!)).toBe(url);
        }
    });

    test("the opening boundary rejects unsafe legacy links and isolates valid links", () => {
        const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        const open = mock(() => null);
        Object.defineProperty(globalThis, "window", { configurable: true, value: { open } });

        try {
            for (const url of invalidUrls) openRoomItemLink(url);
            expect(open).not.toHaveBeenCalled();

            openRoomItemLink(" example.com/path ");
            expect(open).toHaveBeenCalledTimes(1);
            expect(open).toHaveBeenCalledWith("https://example.com/path", "_blank", "noopener,noreferrer");
        } finally {
            if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
            else Reflect.deleteProperty(globalThis, "window");
        }
    });
});
