import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { identifyUser } from "../lib/analytics";

type UserLike = {
    _id?: string;
    username?: string;
    referralCode?: string;
};

type Options = {
    enabled?: boolean;
    distinctIdFallback?: string;
};

export function usePosthogUser(user: UserLike | null | undefined, options?: Options) {
    const posthog = usePostHog();
    const enabled = options?.enabled ?? true;

    useEffect(() => {
        if (!enabled || !posthog || !user) return;

        const distinctId = (user._id as string | undefined) ?? options?.distinctIdFallback;
        if (!distinctId) return;

        identifyUser(posthog, distinctId, {
            username: user.username,
            referralCode: user.referralCode,
        });
    }, [enabled, options?.distinctIdFallback, posthog, user]);
}
