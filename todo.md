# Cozytab Refactor Roadmap

This document turns the July 2026 architecture audit into a sequence of independently executable tasks. It deliberately punts on realtime/game security hardening for now. The focus is frontend state/composition, Convex organization and contracts, maintainable decomposition, and test coverage.

## Working rules for every task

- Preserve existing behavior unless the task explicitly says otherwise.
- Do not combine broad cleanup with feature changes.
- Keep guest, authenticated-owner, invite-visitor, and friend-visitor flows working at every checkpoint.
- Preserve existing Convex API names until all callers have migrated. Prefer compatibility wrappers over a repo-wide flag day.
- Avoid abstraction for its own sake. Extract code only when it establishes a clear owner, removes meaningful duplication, or creates a testable boundary.
- Run `bun run lint`, `bun test ./tests ./src`, and `bun run build` before considering a task complete.
- Do not run Convex codegen manually; the dev server handles it.
- The pre-existing `bun.lock` modification is unrelated and should not be reverted.

## Explicitly deferred

- [ ] Presence-worker authentication, signed room capabilities, authoritative owner identity, and chess authorization/legal-move enforcement.

The current trust model is accepted for now. Refactors should avoid making it worse, but this roadmap does not redesign it.

---

## 1. Add characterization tests around the refactor boundaries

**Goal:** Protect current behavior before changing state ownership and page composition.

**Why first:** The current suite has 13 tests covering currency, Stripe pack mapping, and time-of-day behavior, but none around rooms, guest import, invites, friendships, or frontend room state. The following refactors otherwise have no reliable regression signal.

**Primary context:**

- `tests/currency.test.ts` demonstrates the existing `convex-test` setup.
- `src/guest/guestSession.ts` owns local-storage parsing, sanitation, and persistence.
- `src/guest/state/guestAtoms.ts` owns guest state transitions and persistence side effects.
- `convex/users.ts:440` contains `ensureUser` and guest-session import.
- `convex/rooms.ts` owns active-room creation, selection, saving, and invite heartbeat behavior.
- `convex/invites.ts` owns invite creation, rotation, revocation, and lookup.

**Work:**

- [x] Add unit tests for malformed/legacy guest session data, shortcut normalization, item sanitation, starter inventory, and coin clamping.
- [x] Add Convex tests for first-user creation and guest import.
- [x] Add Convex tests proving only one room is active after create/switch/delete operations.
- [x] Add tests for saving room items, including invalid catalog IDs and clamped coordinates.
- [x] Add invite lifecycle tests for enable, rotate, heartbeat, close, expiry, and lookup.
- [x] Add friendship tests for request, reciprocal auto-accept, accept, decline, cancel, and removal.
- [x] Add inventory purchase/count/hidden-state tests.

**Keep it bounded:** Do not add browser component tests in this task. Start with pure functions and Convex behavior, where tests will be stable and high-value.

**Acceptance criteria:**

- Existing tests remain green.
- Tests cover the behavioral invariants needed by tasks 2–7.
- No production behavior changes beyond small testability extractions.

---

## 2. Define one room-session contract and one room UI-state shape

**Goal:** Establish the target boundary before migrating components.

**Problem:** Authenticated room UI state lives in `src/room/state/roomAtoms.ts`; guest state and persistence live separately in `src/guest/state/guestAtoms.ts`. `src/room/hooks/useRoomState.ts` subscribes to both implementations and manually selects between them.

**Desired shape:**

```ts
type RoomSessionKind = "guest-owner" | "authenticated-owner";

interface RoomSessionAdapter {
  kind: RoomSessionKind;
  load(): RoomSessionSnapshot;
  saveItems(items: RoomItem[]): Promise<void> | void;
  saveComputer(computer: ComputerState): Promise<void> | void;
  saveProfile(profile: ProfileChanges): Promise<void> | void;
}
```

The exact interface may differ after implementation. The important rule is that persistence differences live behind an adapter instead of being expressed as `isGuest ? ... : ...` throughout the room UI.

**Primary context:**

- `src/room/state/roomAtoms.ts`
- `src/guest/state/guestAtoms.ts`
- `src/room/hooks/useRoomState.ts`
- `src/guest/guestSession.ts`
- `shared/guestTypes.ts`

**Work:**

- [x] Write a named `RoomUiState` type shared by guest and authenticated owners.
- [x] Separate ephemeral UI state from persisted domain state. For example, drawer/modal/selection state should not be mixed conceptually with items, inventory, shortcuts, and profile settings.
- [x] Create a room-store factory that can be initialized from a session snapshot.
- [x] Define a narrow adapter contract for persistence operations.
- [x] Implement adapter skeletons for guest storage and Convex-backed owners without migrating `RoomPage` yet.
- [x] Add tests for store initialization and the adapter contract where practical.

**Simplicity guardrail:** Do not build a general repository framework, dependency-injection container, or event bus. Two small concrete adapters and one interface are enough.

**Acceptance criteria:**

- A single room-state shape can represent both guest and authenticated owner UI.
- Existing pages still use the old path; this task only creates the destination architecture.
- The contract does not expose Jotai implementation details to consumers.

---

## 3. Migrate guest and authenticated owners to the unified room store

**Goal:** Remove the dual-atom selection layer and its unsafe casts.

**Primary context:**

- `src/room/hooks/useRoomState.ts:50-225` reads both atom systems and chooses between them.
- `src/room/RoomPage.tsx:85-92` casts room-state results.
- `src/room/RoomPage.tsx:166-170` contains an `as unknown` setter cast caused by mismatched guest/auth APIs.
- `src/computer/ComputerOverlay.tsx:75-91` independently overrides passed props with guest atoms.

**Work:**

- [x] Initialize `RoomPage` with the unified store and the correct adapter.
- [x] Move local-storage persistence side effects out of guest atoms and into the guest adapter.
- [x] Move debounced Convex item saving behind the authenticated adapter or a controller that uses it.
- [x] Replace `useRoomState` with a smaller hook that reads only the active store.
- [x] Remove guest-specific atom reads from `ComputerOverlay`; it should consume resolved values and callbacks.
- [x] Remove the setter and `RoomItem` casts in `RoomPage` that were compensating for divergent APIs.
- [x] Delete obsolete guest/auth atoms only after all consumers have migrated.

**Behavior to preserve:**

- Guest data survives reloads.
- Sign-in can import the guest session and clear it after success.
- Starter inventory is granted once.
- Authenticated room edits remain debounced and save only the active room.
- Guest and authenticated computer/profile customization still works.

**Acceptance criteria:**

- `useRoomState` no longer subscribes to parallel guest and authenticated state trees.
- Room UI code does not branch on guest/auth merely to select a setter.
- No `as unknown` remains in the room state/persistence path.
- Characterization tests from task 1 remain green.

---

## 4. Create a shared visitor-room controller and view

**Goal:** Remove the duplication between invite visits and friend visits.

**Problem:** `src/room/VisitorRoomPage.tsx` and `src/room/FriendVisitPage.tsx` both assemble identity, presence, chat, cursor tracking, music, games, the computer overlay, visitor items, connection UI, and `RoomShell`.

**Target shape:**

```text
Invite access loader ─┐
                     ├─> useVisitorRoomController ─> VisitorRoomExperience
Friend access loader ─┘
```

Invite/friend pages should own access policy and loading/error states. The shared controller/view should own the common interactive experience.

**Primary context:**

- `src/room/VisitorRoomPage.tsx`
- `src/room/FriendVisitPage.tsx`
- `src/room/components/VisitorRoomItems.tsx`
- `src/room/components/VisitorHeader.tsx`
- `src/room/hooks/useVisitorMusic.ts`
- `src/room/hooks/useVisitorGameState.ts`
- `src/room/hooks/useVisitorCursorTracking.ts`
- `src/presence/usePresenceChat.ts`

**Work:**

- [x] Define a normalized `VisitorRoomSource`/view model containing room, template, owner identity, access status, and referral code.
- [x] Extract common identity and overlay state into `useVisitorRoomController`.
- [x] Extract the common room shell and overlays into `VisitorRoomExperience`.
- [x] Keep invite-only behavior in the invite adapter: expiry/status polling, guest identity, referral capture, visitor onboarding, and mobile zoom if it truly differs.
- [x] Keep friend-only behavior in the friend adapter: authenticated requirement and friendship-based access.
- [x] Reuse shared loading, invalid-link, closed-room, and home-navigation states where copy and behavior match.
- [x] Add focused tests for source normalization and controller pure logic.

**Simplicity guardrail:** Prefer a component plus one controller hook over a deep hierarchy of providers. Do not force invite and friend behavior into a huge options object; use small normalized inputs and explicit optional capabilities.

**Acceptance criteria:**

- Invite and friend pages are primarily access/load adapters.
- Common presence/music/game/computer/room-shell composition exists once.
- Invite expiry and friend access semantics remain distinct and correct.

---

## 5. Converge owner and visitor rendering around a shared room experience

**Goal:** Share scene composition without forcing owner editing and visitor viewing into the same controller.

**Problem:** Owner `RoomPage` and visitor pages now reuse some leaf components, but still independently compose the room scene and overlays. Owner behavior is inherently richer, so fully merging controllers would likely reduce clarity.

**Recommended balance:** Share a mostly presentational `RoomExperience`/`RoomScene`; retain separate owner and visitor controllers.

**Primary context:**

- `src/room/RoomPage.tsx`
- `src/room/components/RoomShell.tsx`
- `src/room/components/RoomItemsLayer.tsx`
- `src/room/components/VisitorRoomItems.tsx`
- `src/room/components/RoomOverlays.tsx`
- `src/room/hooks/useRoomOverlaysModel.ts`
- `src/room/components/RoomOverlays.types.ts`

**Work:**

- [x] Identify the common scene inputs: background, time of day, scale/zoom/pan, pointer handlers, room contents, and overlay slots.
- [x] Introduce a shared scene component with slots or small capability-specific props.
- [x] Keep edit mode, drawer, saving, onboarding, daily reward, and sharing in the owner controller.
- [x] Keep access expiry and visitor-specific chat onboarding in the visitor controller.
- [x] Reduce `useRoomOverlaysModel` if it remains a pass-through object assembler rather than meaningful domain logic.
- [x] Replace giant prop bags only where a cohesive sub-model exists; do not hide dependencies inside an all-purpose context.

**Acceptance criteria:**

- Room coordinate/layout behavior is implemented once.
- Owner and visitor controllers remain understandable independently.
- `RoomPage` becomes an orchestration component rather than the owner of dozens of unrelated effects and adapters.

---

## 6. Add shared Convex validators and authentication/domain helpers

**Goal:** Improve backend consistency before splitting files or changing public APIs.

**Problem:** Authentication lookup, room ownership checks, room-item validation, and response shapes are defined inconsistently across Convex modules. Only a minority of exported functions define `returns` validators.

**Primary context:**

- `convex/schema.ts`
- `convex/rooms.ts:18-129`
- `convex/users.ts:9-40`
- `convex/friends.ts:8-119`
- `convex/invites.ts`
- `convex/inventory.ts`
- `convex/roomTemplates.ts`
- `convex/catalog.ts`

**Work:**

- [x] Create `convex/lib/auth.ts` with `getCurrentUser`, `requireIdentity`, `requireUser`, and `requireAdmin` as appropriate.
- [x] Create reusable room access/ownership helpers.
- [x] Export reusable validators for room items, shortcuts, and commonly returned DTOs.
- [x] Use the same room-item validator in the schema and mutation arguments where possible.
- [x] Add explicit `returns` validators incrementally, starting with mutations and access-sensitive queries.
- [x] Replace `v.any()` in `friends.getFriendRoom` with an explicit result contract.
- [x] Standardize expected errors on `ConvexError` where the client should display the message; reserve plain errors for internal failures.

**Compatibility rule:** Do not rename public Convex functions in this task. Generated `api.*` paths should remain stable.

**Acceptance criteria:**

- Auth and ownership rules have one implementation.
- Core public result shapes are runtime-validated.
- Schema and mutation validators cannot silently drift apart.
- Existing client call sites require little or no change.

---

## 7. Split Convex modules by domain while preserving compatibility

**Goal:** Make backend files cohesive and reduce duplicated invite/user logic.

**Priority targets:**

1. `convex/users.ts` (identity, guest import, referrals, rewards, profile, settings, migrations, currency helpers).
2. Invite lifecycle split across `convex/invites.ts` and `convex/rooms.ts`.
3. Stale or overlapping endpoints.

**Suggested internal layout:**

```text
convex/lib/auth.ts
convex/lib/roomAccess.ts
convex/lib/inviteLifecycle.ts
convex/lib/guestImport.ts
convex/lib/userSettings.ts
convex/validators/
```

Public functions may remain in `users.ts`, `rooms.ts`, and `invites.ts` as thin handlers initially. Moving them into nested files changes generated API paths, so only do that with an explicit caller migration and compatibility plan.

**Work:**

- [x] Extract pure and context-based guest import helpers from `users.ts`.
- [x] Extract profile/computer/settings logic from referral/reward logic.
- [x] Centralize invite TTL constants, primary-invite lookup, open/closed checks, heartbeat, and close behavior.
- [x] Consolidate or document the roles of `rooms.getRoomByInvite` and `invites.getInviteByToken`.
- [x] Remove deprecated `rooms.renewLease` once no supported client calls it.
- [x] Review unused public endpoints such as `friends.getUserByExternalId` and `invites.revokeAllInvites`; remove or internalize them if truly unused.
- [x] Make development backfills internal functions where possible.
- [x] Document active-room and default-template invariants next to the helpers that enforce them.

**Simplicity guardrail:** Splitting one large file into many files is not automatically better. Keep related helpers together, and avoid files that contain only a single trivial wrapper.

**Acceptance criteria:**

- `users.ts`, `rooms.ts`, and `invites.ts` read as public API surfaces rather than mixed implementation stores.
- Invite behavior has one source of truth.
- Public API removals are verified against all frontend callers.
- Convex characterization tests cover every moved invariant.

---

## 8. Extract a small window-manager core from `ComputerScreen`

**Goal:** Make the 1,000-line computer implementation maintainable without turning it into a framework.

**Problem:** `src/computer/ComputerScreen.tsx` owns window state, drag/resize mechanics, shortcut editing, profile mutation, room switching, volume panels, dev tools, and the overall desktop render.

**Primary context:**

- `src/computer/ComputerScreen.tsx`
- `src/computer/desktopUtils.ts`
- `src/computer/DesktopGrid.tsx`
- `src/computer/WindowFrame.tsx`
- `src/computer/ComputerWindowContent.tsx`
- `src/computer/Taskbar.tsx`

**Work:**

- [x] Extract `useWindowManager` for open/close/focus/z-order/drag/resize/clamping.
- [x] Keep its state model local to the computer feature; do not add it to global Jotai state.
- [x] Extract shortcut selection/rename/add/delete/drag behavior only if it remains a substantial independent block after the window manager moves.
- [x] Move profile mutation and dev-tool actions closer to the panels that trigger them or into focused hooks.
- [x] Leave layout composition in `ComputerScreen` so the feature still has an obvious entry point.
- [x] Unit test pure window reducer/helper behavior rather than pointer-event implementation details.

**Acceptance criteria:**

- `ComputerScreen` primarily composes the desktop and feature panels.
- Window behavior has a clear, testable owner.
- The extraction reduces state/effect interleaving without introducing generic abstractions.

---

## 9. Separate presence protocol, transport, and React state

**Goal:** Make `useWebSocketPresence` understandable and testable while leaving the deferred security model intact.

**Primary context:**

- `src/hooks/useWebSocketPresence.ts`
- `src/presence/usePresenceChat.ts`
- `presence-worker/src/PresenceRoom.ts`
- `shared/gameTypes.ts`

**Work:**

- [x] Define environment-neutral presence message and visitor types in `shared/presenceProtocol.ts`.
- [x] Update both browser and worker to consume the shared types.
- [x] Keep worker runtime validation, but organize it around the shared discriminated union.
- [x] Extract WebSocket connect/reconnect/heartbeat/send mechanics into a transport client.
- [x] Move incoming presence changes into a reducer or pure transition functions.
- [x] Keep typing-audio behavior in a separate hook/helper.
- [x] Keep coordinate/context filtering explicit and covered by unit tests.

**Deferred-security guardrail:** Do not add token issuance or worker authentication in this task. Leave a concise TODO at the upgrade boundary for the future capability-token work.

**Acceptance criteria:**

- The protocol is defined once.
- Transport lifecycle can be reasoned about independently from UI state.
- Most presence state transitions are testable without a live WebSocket.
- Reconnection and heartbeat behavior remains unchanged.

---

## 10. Decompose chess UI along controller/view boundaries

**Goal:** Reduce `ChessGame.tsx` complexity while keeping a straightforward feature structure.

**Primary context:**

- `src/games/chess/ChessGame.tsx`
- `src/games/components/GameOverlay.tsx`
- `src/games/chess/useChessSounds.ts`
- `src/games/chess/chessSideStorage.ts`
- `convex/games.ts`

**Work:**

- [x] Extract a `useChessController` only for move selection, promotion, FEN-derived status, and player/turn calculations.
- [x] Extract visually cohesive pieces such as player badges, result/draw overlays, and board/cursor rendering.
- [x] Keep small one-off helpers in the same file when extraction would make navigation worse.
- [x] Add unit tests for legal UI transitions, promotion flow, status derivation, side selection, and draw/resign signaling.
- [x] Preserve the existing client-authoritative backend behavior because security hardening is deferred.

**Acceptance criteria:**

- Chess rules/state logic is testable without rendering the complete overlay.
- Layout remains easy to understand from one main component.
- No explosion of tiny single-purpose files.

---

## 11. Add lazy-loading boundaries that match the new feature boundaries

**Goal:** Convert architectural separation into a smaller initial JavaScript payload.

**Baseline:** `bun run build` currently emits one approximately 850 KB minified JavaScript chunk (approximately 251 KB gzip) and triggers Vite's chunk-size warning.

**Primary context:**

- `src/App.tsx` eagerly imports all route pages.
- Room pages eagerly import computer, shop, music, and game overlays.
- `vite.config.ts` currently has no explicit chunking configuration.

**Work:**

- [x] Lazy-load admin and non-home route modules.
- [x] Lazy-load heavy interaction surfaces such as the computer and chess/game overlay when first opened.
- [x] Add appropriate suspense/loading states using existing Cozytab styling.
- [x] Inspect Vite output before adding manual chunk rules; prefer natural dynamic-import boundaries.
- [x] Record before/after main-chunk and total transfer sizes in the task/commit notes.

**Simplicity guardrail:** Do not migrate router modes solely for code splitting unless normal `lazy`/dynamic imports are insufficient.

**Acceptance criteria:**

- The initial route no longer downloads admin and unopened heavy feature implementations.
- Build output contains sensible feature chunks.
- No loading flash or broken overlay state is introduced.

**Measured result:** The main JavaScript chunk fell from approximately 849 KB minified / 251 KB gzip to 599 KB minified / 182 KB gzip. Admin, visitor, computer, and game code now emit as separate feature chunks.

---

## 12. Final consistency and dead-code pass

**Goal:** Remove scaffolding made obsolete by the refactor and tighten implementation standards.

**Work:**

- [x] Remove obsolete atoms, adapters, hooks, compatibility wrappers, and unused exports.
- [x] Remove redundant type barrels that only obscure ownership.
- [x] Replace remaining avoidable `as unknown` and broad `v.any()` uses.
- [x] Review direct frontend imports from `@convex/lib/*`; move environment-neutral constants/types into `shared/` where appropriate.
- [x] Consolidate repeated loading/error/empty states introduced across room routes.
- [x] Bring hard-coded stone/purple/red/green styling—especially in `FriendsPanel`—onto the Cozytab design tokens where practical.
- [x] Run `rg` for `TODO`, `deprecated`, `eslint-disable`, `as unknown`, and unused compatibility endpoints; resolve or document each result.
- [x] Run the full lint, test, and production-build suite.

**Acceptance criteria:**

- No temporary migration layer remains without a documented reason.
- Feature directories have clear entry points and ownership.
- The final build is green and the roadmap's characterization tests cover the preserved behavior.

---

## Suggested execution order

Execute tasks in numeric order, with these practical groupings:

1. **Safety net:** Task 1.
2. **Frontend state foundation:** Tasks 2–3.
3. **Room composition:** Tasks 4–5.
4. **Convex contracts and organization:** Tasks 6–7.
5. **Balanced component decomposition:** Tasks 8–10.
6. **Delivery cleanup:** Tasks 11–12.

Each numbered task should be treated as its own implementation run. If a task grows too large, stop at a green compatibility checkpoint and add sub-checkpoints here instead of mixing the next architectural layer into the same change.
