/** Normalize user supplied room links for safe external navigation. */
export function normalizeRoomItemUrl(value: string): string | undefined {
    const trimmed = value.trim();

    if (!trimmed || trimmed.length > 2048) return;

    // URL parsing silently removes some control characters; reject them instead.
    if (Array.from(trimmed).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return;

    // Preserve only HTTP(S) schemes; reject other URI schemes before considering a bare host.
    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);

    if (hasScheme && !/^https?:\/\//i.test(trimmed)) return;

    // Match shortcut behavior: bare hostnames are treated as HTTPS links.
    const candidate = hasScheme ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(candidate);

        if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) return;

        // Encoding and the HTTPS prefix can expand the input. Keep saved links valid on re-save.
        if (url.href.length > 2048) return;

        return url.href;
    } catch {
        return;
    }
}
