import { expect, test } from "bun:test";
import { debounce } from "../src/lib/debounce";

test("debounce keeps the latest call and cancellation prevents a trailing write", async () => {
    const writes: string[] = [];
    const save = debounce((value: string) => writes.push(value), 5);
    save("old");
    save("latest");
    await Bun.sleep(20);
    expect(writes).toEqual(["latest"]);
    save("cancelled");
    save.cancel();
    save.cancel();
    await Bun.sleep(20);
    expect(writes).toEqual(["latest"]);
    save("reused");
    await Bun.sleep(20);
    expect(writes).toEqual(["latest", "reused"]);
});
