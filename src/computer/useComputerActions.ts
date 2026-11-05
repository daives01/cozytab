import { useCallback, useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { clearGuestSession } from "@/guest/guestSession";

const DISPLAY_NAME_MAX_LENGTH = 50;

export function useComputerProfileActions({
    displayName,
    username,
    onDisplayNameUpdated,
}: {
    displayName?: string;
    username?: string;
    onDisplayNameUpdated?: (next: string) => void;
}) {
    const updateDisplayName = useMutation(api.users.updateDisplayName);
    const [currentDisplayName, setCurrentDisplayName] = useState(displayName ?? username ?? "You");
    const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
    const [displayNameError, setDisplayNameError] = useState<string | null>(null);
    const sourceName = displayName ?? username ?? "You";
    const [previousSourceName, setPreviousSourceName] = useState(sourceName);
    if (previousSourceName !== sourceName) {
        setPreviousSourceName(sourceName);
        setCurrentDisplayName(sourceName);
    }
    const handleSaveDisplayName = useCallback(
        async (next: string) => {
            const trimmed = next.trim();
            if (!trimmed) {
                setDisplayNameError("Display name cannot be empty");
                return;
            }
            setIsSavingDisplayName(true);
            setDisplayNameError(null);
            try {
                const result = await updateDisplayName({ displayName: trimmed.slice(0, DISPLAY_NAME_MAX_LENGTH) });
                setCurrentDisplayName(result.displayName);
                onDisplayNameUpdated?.(result.displayName);
            } catch (error) {
                setDisplayNameError(error instanceof Error ? error.message : "Failed to update display name");
            } finally {
                setIsSavingDisplayName(false);
            }
        },
        [onDisplayNameUpdated, updateDisplayName],
    );
    return { currentDisplayName, isSavingDisplayName, displayNameError, handleSaveDisplayName };
}

export function useComputerDevActions() {
    const { signOut } = useClerk();
    const deleteMyAccount = useMutation(api.users.devDeleteMyAccount);
    const deleteUser = useCallback(async () => {
        try {
            await deleteMyAccount({});
            await signOut();
        } catch (error) {
            console.error("Dev delete failed", error);
        }
    }, [deleteMyAccount, signOut]);
    const resetStorage = useCallback(() => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            clearGuestSession();
        } catch (error) {
            console.error("Storage reset failed", error);
        }
    }, []);
    return { signOut, deleteUser, resetStorage };
}
