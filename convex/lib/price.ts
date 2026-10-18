export function isValidPrice(price: number): boolean {
    return Number.isFinite(price) && Number.isInteger(price) && price >= 0;
}

export function assertValidPrice(price: number): void {
    if (!isValidPrice(price)) {
        throw new Error("Price must be a finite nonnegative integer");
    }
}
