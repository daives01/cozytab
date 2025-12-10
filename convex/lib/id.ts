export const randomId = () => {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid;
    return Math.random().toString(36).slice(2);
};
