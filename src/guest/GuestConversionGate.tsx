import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { api } from "@convex/_generated/api";
import type { GuestSessionState } from "@shared/guestTypes";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { resolveBrowserGuestProgress, type GuestConversionDisposition } from "./guestConversion";

type ResolutionState = "resolving" | "settled" | "error";

const resolveGuestProgressMutation = makeFunctionReference<
    "mutation",
    { username: string; referralCode?: string; guestProgress: GuestSessionState },
    { disposition: GuestConversionDisposition }
>("guestConversion:resolveGuestProgress");

export function GuestConversionGate({ username, children }: { username: string; children: ReactNode }) {
    const resolveGuestProgress = useMutation(resolveGuestProgressMutation);
    const user = useQuery(api.users.getMe);
    const [attempt, setAttempt] = useState(0);
    const [resolutionState, setResolutionState] = useState<ResolutionState>("resolving");
    const startedAttemptRef = useRef(-1);

    usePresenceHeartbeat(resolutionState === "settled" && user !== undefined && user !== null);

    useEffect(() => {
        if (startedAttemptRef.current === attempt) return;
        startedAttemptRef.current = attempt;

        void resolveBrowserGuestProgress({ username, resolveGuestProgress })
            .then(() => setResolutionState("settled"))
            .catch((error: unknown) => {
                console.error("Failed to resolve Guest Progress", error);
                setResolutionState("error");
            });
    }, [attempt, resolveGuestProgress, username]);

    if (resolutionState === "error") {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-background)] p-6">
                <div className="max-w-md rounded-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] p-6 text-center shadow-[8px_8px_0px_0px_var(--color-foreground)]">
                    <h1 className="text-xl font-bold">We couldn&apos;t finish signing you in.</h1>
                    <p className="mt-2 text-sm">Your guest progress is safe. Try again when you&apos;re ready.</p>
                    <button
                        type="button"
                        className="mt-5 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] px-5 py-2 font-bold shadow-[4px_4px_0px_0px_var(--color-foreground)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                        onClick={() => {
                            setResolutionState("resolving");
                            setAttempt((current) => current + 1);
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (resolutionState !== "settled" || user === undefined || user === null) {
        return (
            <div className="flex h-screen w-screen items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading your cozytab...
            </div>
        );
    }

    return children;
}
