const REFERRAL_CODE_KEY = "cozytab_referral_code";

function getFromStorage(getter: (storage: Storage) => string | null) {
    if (typeof window === "undefined") return null;
    try {
        return getter(window.localStorage);
    } catch {
        try {
            return getter(window.sessionStorage);
        } catch {
            return null;
        }
    }
}

export function saveReferralCode(code: string | null | undefined) {
    if (typeof window === "undefined" || !code) return;
    try {
        window.localStorage.setItem(REFERRAL_CODE_KEY, code);
    } catch {
        try {
            window.sessionStorage.setItem(REFERRAL_CODE_KEY, code);
        } catch {
            // ignore write failures
        }
    }
}

export function getReferralCode(): string | null {
    return (
        getFromStorage((storage) => storage.getItem(REFERRAL_CODE_KEY)) ??
        null
    );
}

export function clearReferralCode() {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(REFERRAL_CODE_KEY);
    } catch {
        // ignore clear failures
    }
    try {
        window.sessionStorage.removeItem(REFERRAL_CODE_KEY);
    } catch {
        // ignore clear failures
    }
}
