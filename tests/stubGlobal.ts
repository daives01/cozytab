/** Replace configurable runtime accessors without invoking their setters. */
export function stubGlobal<K extends keyof typeof globalThis>(key: K, value: (typeof globalThis)[K]) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
        configurable: true,
        enumerable: previous?.enumerable ?? true,
        writable: true,
        value,
    });

    return () => {
        if (previous) Object.defineProperty(globalThis, key, previous);
        else Reflect.deleteProperty(globalThis, key);
    };
}
