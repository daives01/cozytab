export function debounce<Args extends unknown[]>(func: (...args: Args) => void, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const cancel = () => clearTimeout(timeout);
    const debounced = (...args: Args) => {
        cancel();
        timeout = setTimeout(() => func(...args), wait);
    };

    return Object.assign(debounced, { cancel });
}
