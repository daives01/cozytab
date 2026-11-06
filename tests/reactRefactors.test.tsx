import { createConvexTest, seedCatalogItem, seedUser, seedTemplate, seedRoom } from "./convexTestUtils";
import { FriendsPanel } from "@/computer/FriendsPanel";
import { ConvexError } from "convex/values";
import { afterAll, afterEach, expect, test, spyOn } from "bun:test";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { VisitorMusicModal } from "@/musicPlayer/VisitorMusicModal";
import { ShareModal } from "@/room/ShareModal";
import { useComputerProfileActions } from "@/computer/useComputerActions";
import type { RoomItem } from "@/types";

const fixtureDb = createConvexTest();
const fixtureUserId = await seedUser(fixtureDb, "fixture");
const fixtureUser = await fixtureDb.run((ctx) => ctx.db.get(fixtureUserId));

if (!fixtureUser) throw new Error("Missing inserted user");

const fixtureTemplate = await seedTemplate(fixtureDb);
const fixtureRoom = await seedRoom(fixtureDb, fixtureUserId, fixtureTemplate);
const fixtureCatalog = await seedCatalogItem(fixtureDb);

const originalWindow = globalThis.window;
const originalActEnvironment = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");
const client = new ConvexReactClient("https://example.convex.cloud", { disabled: true });

spyOn(client, "watchQuery").mockImplementation(() => ({
    onUpdate: () => noop,
    localQueryResult: () => null,
    journal: () => undefined,
}));

let renderer: ReactTestRenderer;
const noop = () => {};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterAll(() => {
    if (originalActEnvironment) Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironment);
    else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

afterEach(async () => {
    if (renderer) await act(() => renderer.unmount());
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
});

async function render(element: React.ReactNode) {
    await act(() => {
        renderer = create(<ConvexProvider client={client}>{element}</ConvexProvider>);
    });
}

async function update(element: React.ReactNode) {
    await act(() => renderer.update(<ConvexProvider client={client}>{element}</ConvexProvider>));
}

const output = () => JSON.stringify(renderer.toJSON());

function browser() {
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            addEventListener: noop,
            removeEventListener: noop,
            location: { origin: "https://cozy.test" },
            localStorage: { getItem: () => null },
        },
    });
}

const item = (id?: string): RoomItem => ({
    id: "music",
    catalogItemId: fixtureCatalog,
    x: 0,
    y: 0,
    musicType: "youtube",
    musicUrl: id ? `https://youtube.com/watch?v=${id}` : undefined,
});

test("visitor track switches ignore late titles and settle failed or missing videos", async () => {
    browser();
    const pending: Array<(response: Response) => void> = [];

    const fetch = spyOn(globalThis, "fetch").mockImplementation(
        () => new Promise<Response>((resolve) => pending.push(resolve)),
    );

    try {
        await render(<VisitorMusicModal item={item("aaaaaaaaaaa")} onClose={noop} />);
        expect(output()).toContain("Finding title...");
        await update(<VisitorMusicModal item={item("bbbbbbbbbbb")} onClose={noop} />);
        await act(async () => pending[1](Response.json({ title: "Second track" })));
        expect(output()).toContain("Second track");
        await act(async () => pending[0](Response.json({ title: "Stale first track" })));
        expect(output()).toContain("Second track");
        expect(output()).not.toContain("Stale first track");
        await update(<VisitorMusicModal item={item("ccccccccccc")} onClose={noop} />);
        expect(output()).not.toContain("Second track");
        await act(async () => pending[2](new Response(null, { status: 500 })));
        expect(output()).not.toContain("Finding title...");
        await update(<VisitorMusicModal item={item()} onClose={noop} />);
        expect(output()).toContain("Waiting for a track");
        expect(output()).not.toContain("Finding title...");
        expect(fetch).toHaveBeenCalledTimes(3);
    } finally {
        fetch.mockRestore();
    }
});

test("saved profile name follows subsequent display-name prop updates", async () => {
    const mutation = spyOn(client, "mutation").mockResolvedValue({ displayName: "Saved name" });

    function Profile({ name }: { name: string }) {
        const profile = useComputerProfileActions({ displayName: name });

        return (
            <button onClick={() => profile.handleSaveDisplayName(" Saved name ")}>{profile.currentDisplayName}</button>
        );
    }

    try {
        await render(<Profile name="Original" />);
        await act(async () => renderer.root.findByType("button").props.onClick());
        expect(output()).toContain("Saved name");
        await update(<Profile name="Remote update" />);
        expect(output()).toContain("Remote update");
        expect(output()).not.toContain("Saved name");
    } finally {
        mutation.mockRestore();
    }
});

test("an expired invite update removes the share link and live access", async () => {
    browser();
    const initialTime = 1_000_000;
    const clock = spyOn(Date, "now").mockReturnValue(initialTime);

    try {
        const inviteId = await fixtureDb.run((ctx) =>
            ctx.db.insert("roomInvites", {
                roomId: fixtureRoom,
                createdBy: fixtureUser._id,
                createdAt: initialTime,
                code: "ABCDEF",
                expiresAt: initialTime + 60000,
            }),
        );

        const invite = await fixtureDb.run((ctx) => ctx.db.get(inviteId));

        if (!invite) throw new Error("Missing inserted invite");
        await render(<ShareModal activeInvites={[invite]} onClose={noop} />);
        expect(output()).toContain("https://cozy.test/visit/ABCDEF");
        clock.mockReturnValue(initialTime + 2000);
        await update(<ShareModal activeInvites={[{ ...invite, expiresAt: initialTime + 1000 }]} onClose={noop} />);
        // The stored render time still precedes expiry; the timer must advance it.
        expect(output()).toContain("https://cozy.test/visit/ABCDEF");
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 25));
        });
        expect(output()).toContain("Sharing is disabled");
        expect(output()).not.toContain("https://cozy.test/visit/ABCDEF");
        expect(output()).not.toContain("Room is visible to visitors");
    } finally {
        clock.mockRestore();
    }
});

for (const data of [{ reason: "private detail" }, "Friend code not found"]) {
    test(`Add Friend renders safe mutation error for ${typeof data} data`, async () => {
        browser();

        const query = spyOn(client, "watchQuery").mockImplementation(() => ({
            onUpdate: () => noop,
            localQueryResult: () => undefined,
            journal: () => undefined,
        }));

        const mutation = spyOn(client, "mutation").mockRejectedValue(new ConvexError(data));

        try {
            await render(<FriendsPanel />);
            await act(() =>
                renderer.root
                    .findAllByType("button")
                    .find((button) => button.props.children.includes("Add Friend"))!
                    .props.onClick(),
            );
            await act(() => renderer.root.findByType("input").props.onChange({ target: { value: "ABCDEF" } }));
            await act(async () =>
                renderer.root
                    .findAllByType("button")
                    .find((button) => button.props.children === "Send")!
                    .props.onClick(),
            );
            expect(mutation).toHaveBeenCalledTimes(1);
            expect(output()).toContain(typeof data === "string" ? data : "Something went wrong");
            expect(output()).not.toContain("private detail");
            expect(
                renderer.root.findAllByType("button").find((button) => button.props.children === "Send")!.props
                    .disabled,
            ).toBe(false);
        } finally {
            mutation.mockRestore();
            query.mockRestore();
        }
    });
}
