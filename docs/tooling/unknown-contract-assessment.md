# Unknown contract assessment — issue #7

Baseline: merged main `548ac81`. Before/after: unknown parameters 17/17, unknown returns 3/3, unknown aliases 0/0, runtime typeof 76/76. Enforced rules increase from nine to ten: enable only no-unknown-type-aliases. No runtime code or validation changes.

Pinned implementation evidence: vendor/anti-slop/src/rules/no-unknown-parameters.ts permits only a parameter named cause or the subject of an explicit type predicate. It has no boundary-parser exemption or configuration. Parsers returning normalized values and error presentation helpers therefore remain legitimate findings. Keep this rule audit-only; converting unknown to a domain type without validation would weaken the contract.

no-runtime-typeof.ts defaults allowInTypeGuards to false; its sole option exempts checks in the nearest function only when that function explicitly returns a type predicate. Comparisons against the literal undefined are always exempt, even for property expressions. Normalizers, external API decoding, callback capability checks and DOM feature detection do not all fit this exemption. Keep audit-only with current defaults; do not remove guards or blanket-suppress files. A future parser redesign must be reviewed subsystem by subsystem.

no-unknown-type-aliases.ts resolves local aliases and unions to unknown; it does not ban unknown nested inside legitimate payload containers. Zero findings justify enabling this narrow transparency policy. It is syntactic/local resolution, not proof that imported or generic contracts are safe. no-unknown-returns.ts follows local aliases, unions and Promise/PromiseLike wrappers, but supplies no generic-boundary exemption.

Return follow-up (base ed6aa26): unknown returns 3 → 0, unknown parameters 17 → 16 (the heartbeat result now has its producer type), aliases 0 → 0, typeof 76 → 76; enable no-unknown-returns as the eleventh global error. completeOnboarding, heartbeatInvite and closeInviteSession now use FunctionReturnType from their exact Convex API producers. Onboarding returns success, heartbeat delegates to heartbeatRoom, and close returns closed/expiresAt. Callback arguments and heartbeat runtime guards remain intact. Mounted lifecycle tests cover onboarding success/failure settlement and heartbeat closure/timeout timer stopping and unmount close cleanup. Other policies remain unchanged.

Complete grouped location inventory follows. The return findings listed below are resolved; other listed occurrences are retained. Guest persistence/import, settings normalization, external API/error handling, presence transport and DOM/event handling are separate subsystems; none is implicitly scheduled for a broad rewrite. Source lines are baseline and unchanged.

| Rule                             | Source                                   | Every reported line                                                                              |
| -------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| anti-slop(no-runtime-typeof)     | `convex/guestConversion.ts`              | 53                                                                                               |
| anti-slop(no-runtime-typeof)     | `convex/http.ts`                         | 16, 17                                                                                           |
| anti-slop(no-runtime-typeof)     | `convex/lib/guestImport.ts`              | 9                                                                                                |
| anti-slop(no-runtime-typeof)     | `convex/lib/userSettings.ts`             | 2, 45, 49                                                                                        |
| anti-slop(no-runtime-typeof)     | `convex/users.ts`                        | 335, 335                                                                                         |
| anti-slop(no-runtime-typeof)     | `presence-worker/src/PresenceRoom.ts`    | 30, 34, 38, 42, 46, 50, 58, 69, 70, 71, 71, 71, 104, 109, 109, 120, 127, 136, 171, 244, 402, 405 |
| anti-slop(no-runtime-typeof)     | `src/computer/desktopUtils.ts`           | 47, 51                                                                                           |
| anti-slop(no-runtime-typeof)     | `src/games/chess/ChessGame.tsx`          | 374, 375                                                                                         |
| anti-slop(no-runtime-typeof)     | `src/guest/guestSession.ts`              | 80, 101, 105, 169, 173, 214, 216, 217, 218, 219, 220, 242, 292, 341                              |
| anti-slop(no-runtime-typeof)     | `src/hooks/useKeyboardSoundSetting.ts`   | 17                                                                                               |
| anti-slop(no-runtime-typeof)     | `src/hooks/useTouchCapability.ts`        | 14, 57, 59, 67, 69                                                                               |
| anti-slop(no-runtime-typeof)     | `src/hooks/useWebSocketPresence.ts`      | 110, 124, 239                                                                                    |
| anti-slop(no-runtime-typeof)     | `src/musicPlayer/MusicPlayerButtons.tsx` | 88                                                                                               |
| anti-slop(no-runtime-typeof)     | `src/musicPlayer/MusicPlayerModal.tsx`   | 81                                                                                               |
| anti-slop(no-runtime-typeof)     | `src/musicPlayer/VisitorMusicModal.tsx`  | 55                                                                                               |
| anti-slop(no-runtime-typeof)     | `src/room/hooks/useRoomPageEffects.ts`   | 25, 194, 198                                                                                     |
| anti-slop(no-runtime-typeof)     | `src/room/hooks/useRoomState.ts`         | 48, 59, 69, 79, 89, 114                                                                          |
| anti-slop(no-runtime-typeof)     | `src/room/session/roomDraft.ts`          | 21, 26, 32, 33                                                                                   |
| anti-slop(no-runtime-typeof)     | `src/room/session/roomEditingSession.ts` | 17, 21                                                                                           |
| anti-slop(no-unknown-parameters) | `convex/guestConversion.ts`              | 52                                                                                               |
| anti-slop(no-unknown-parameters) | `convex/lib/guestImport.ts`              | 8                                                                                                |
| anti-slop(no-unknown-parameters) | `convex/lib/userSettings.ts`             | 1                                                                                                |
| anti-slop(no-unknown-parameters) | `presence-worker/src/PresenceRoom.ts`    | 102, 108, 300                                                                                    |
| anti-slop(no-unknown-parameters) | `src/computer/FriendsPanel.tsx`          | 12                                                                                               |
| anti-slop(no-unknown-parameters) | `src/guest/GuestConversionGate.tsx`      | 33                                                                                               |
| anti-slop(no-unknown-parameters) | `src/guest/guestSession.ts`              | 79, 84, 211                                                                                      |
| anti-slop(no-unknown-parameters) | `src/hooks/useKeyboardSoundSetting.ts`   | 16                                                                                               |
| anti-slop(no-unknown-parameters) | `src/musicPlayer/MusicPlayerButtons.tsx` | 55                                                                                               |
| anti-slop(no-unknown-parameters) | `src/room/hooks/useRoomPageEffects.ts`   | 192                                                                                              |
| anti-slop(no-unknown-parameters) | `src/room/session/roomEditingSession.ts` | 15, 126                                                                                          |
| anti-slop(no-unknown-parameters) | `tests/roomSession.test.ts`              | 21                                                                                               |
| anti-slop(no-unknown-returns)    | `src/room/hooks/useRoomPageEffects.ts`   | 54, 143, 144                                                                                     |

Follow-up audit: 1,672 advisory findings across the full audit scope, including the new lifecycle tests. Selected return findings: zero. The inventory above records historical baseline locations.
