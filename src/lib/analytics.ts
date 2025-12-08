import posthog, { type PostHog } from "posthog-js";

export const ANALYTICS_EVENTS = {
    SIGN_UP: "sign_up",
    APP_ERROR: "app_error",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type AnalyticsClient = PostHog | undefined;

function resolveClient(client?: AnalyticsClient) {
    return client ?? posthog;
}

export function captureEvent(
    client: AnalyticsClient,
    event: AnalyticsEventName,
    properties?: Record<string, unknown>
) {
    const resolvedClient = resolveClient(client);
    if (!resolvedClient) return;
    resolvedClient.capture(event, properties);
}

export function identifyUser(
    client: AnalyticsClient,
    distinctId: string,
    properties?: Record<string, unknown>
) {
    const resolvedClient = resolveClient(client);
    if (!resolvedClient || !distinctId) return;
    resolvedClient.identify(distinctId, properties);
}

export function captureError(
    client: AnalyticsClient,
    error: unknown,
    context: Record<string, unknown> = {}
) {
    const resolvedClient = resolveClient(client);
    if (!resolvedClient) return;

    const normalized =
        error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
            : {
                message: typeof error === "string" ? error : JSON.stringify(error),
                name: "UnknownError",
            };

    resolvedClient.capture(ANALYTICS_EVENTS.APP_ERROR, {
        ...normalized,
        ...context,
    });
}

type SignUpProps = {
    referralCodeProvided: boolean;
    importedInventoryCount: number;
    hadRoomItems: boolean;
    username?: string;
    distinctId?: string;
};

export function trackSignUp(client: AnalyticsClient, props: SignUpProps) {
    const resolvedClient = resolveClient(client);
    if (!resolvedClient) return;

    captureEvent(resolvedClient, ANALYTICS_EVENTS.SIGN_UP, {
        referralCodeProvided: props.referralCodeProvided,
        importedInventoryCount: props.importedInventoryCount,
        hadRoomItems: props.hadRoomItems,
    });

    if (props.distinctId) {
        identifyUser(resolvedClient, props.distinctId, {
            username: props.username,
        });
    }
}
