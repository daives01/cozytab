export function canSave(isGuest: boolean) {
    return !isGuest;
}

export function canShare(isGuest: boolean) {
    return !isGuest;
}

export function canUseComputer(isGuest: boolean) {
    return {
        allowOpen: true,
        showLoginPrompt: isGuest,
    };
}

export function purchaseWithBudget(balance: number, price: number) {
    const safeBalance = Math.max(0, balance);
    const remaining = safeBalance - price;
    return {
        canPurchase: remaining >= 0,
        remaining: Math.max(remaining, 0),
    };
}

