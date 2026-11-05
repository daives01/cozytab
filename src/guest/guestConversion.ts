import type { GuestSessionState } from "@shared/guestTypes";
import { clearReferralCode, getReferralCode } from "@/referralStorage";
import { clearGuestSession, readGuestSession } from "./guestSession";

export type GuestConversionDisposition = "preserved" | "discarded_existing_user";

type ResolveGuestProgress = (args: {
    username: string;
    referralCode?: string;
    guestProgress: GuestSessionState;
}) => Promise<{ disposition: GuestConversionDisposition }>;

export async function resolveBrowserGuestProgress({
    username,
    resolveGuestProgress,
}: {
    username: string;
    resolveGuestProgress: ResolveGuestProgress;
}) {
    const referralCode = getReferralCode() ?? undefined;

    const result = await resolveGuestProgress({
        username,
        referralCode,
        guestProgress: readGuestSession(),
    });

    clearGuestSession();
    clearReferralCode();

    return result;
}
