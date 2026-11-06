import { expect, test } from "bun:test";
import { isChessSquare, readChessSide, readChessSignal } from "../src/games/chess/useChessController";

test("chess boundaries reject malformed squares and presence claims", () => {
    for (const value of [null, undefined, {}, [], 1, "", "a0", "i1", "a10", "A1", "a1\n"]) {
        expect(isChessSquare(value)).toBe(false);
        expect(readChessSide(value)).toBeNull();
        expect(readChessSignal(value)).toBeNull();
    }

    for (const file of "abcdefgh") {
        for (const rank of "12345678") expect(isChessSquare(file + rank)).toBe(true);
    }

    expect(readChessSide("white")).toBe("white");
    expect(readChessSide("black")).toBe("black");

    for (const signal of ["resign", "drawOffer", "drawAccept", "drawDecline"]) {
        expect(readChessSignal(signal)).toBe(signal);
        expect(readChessSide(signal)).toBeNull();
    }

    expect(readChessSignal("white")).toBeNull();
    expect(readChessSignal("black")).toBeNull();
});
