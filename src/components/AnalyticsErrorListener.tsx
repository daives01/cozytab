import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import { captureError } from "../lib/analytics";

export function AnalyticsErrorListener() {
    const posthog = usePostHog();

    useEffect(() => {
        if (!posthog) return;

        const handleError = (event: ErrorEvent) => {
            captureError(posthog, event.error ?? event.message, {
                source: "window.error",
                filename: event.filename,
                line: event.lineno,
                col: event.colno,
            });
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            captureError(posthog, event.reason, { source: "unhandledrejection" });
        };

        window.addEventListener("error", handleError);
        window.addEventListener("unhandledrejection", handleRejection);

        return () => {
            window.removeEventListener("error", handleError);
            window.removeEventListener("unhandledrejection", handleRejection);
        };
    }, [posthog]);

    return null;
}
