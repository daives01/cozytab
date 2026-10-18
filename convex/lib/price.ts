export function assertValidPrice(price: number): void {
    if (!Number.isFinite(price) || !Number.isInteger(price) || price < 0) {
        throw new Error("Price must be a finite nonnegative integer");
    }
}
