# Cozytab

Cozytab is a shared-room context in which owners arrange rooms and visitors experience them together.

## Language

**Room Editing Session**:
The sole writer of one room's persisted contents during an owner's active room-page visit, including any unfinished editing interaction. It remains active outside edit mode; user-wide inventory, currency, profile, computer settings, presence, and sharing are not part of it.
_Avoid_: Room Session, Owner Room Session

**Guest Conversion**:
The creation of a new signed-in user from a browser's guest progress, preserving that progress as the user's initial Cozytab state. If the signed-in user already exists, their saved state remains authoritative and the guest progress is discarded.
_Avoid_: Guest Import, Account Creation

**Guest Progress**:
The temporary room, inventory, currency, shortcuts, and onboarding choices accumulated while trying Cozytab before sign-up. After sign-in, it is either preserved through Guest Conversion or discarded because the user already owns a room.
_Avoid_: Guest Session Data, Local Data
