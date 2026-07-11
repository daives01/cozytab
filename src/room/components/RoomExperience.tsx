import { RoomShell, type RoomShellProps } from "./RoomShell";

/** Shared presentational room scene used by owner and visitor controllers. */
export function RoomExperience(props: RoomShellProps) {
    return <RoomShell {...props} />;
}
