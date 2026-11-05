import { Button } from "@/components/ui/button";
import type { RoomSaveStatus } from "../session/types";

interface RoomSaveFeedbackProps {
    saveStatus: RoomSaveStatus;
    saveError?: string | null;
    onRetrySave?: () => Promise<void>;
}

export function RoomSaveFeedback({ saveStatus, saveError, onRetrySave }: RoomSaveFeedbackProps) {
    return (
        <div className="flex flex-col gap-2">
            <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-2">
                <p className="text-sm font-bold">
                    {saveStatus === "saving"
                        ? "Saving room…"
                        : saveStatus === "clean"
                          ? "Room saved."
                          : saveStatus === "error"
                            ? "Couldn’t save your room."
                            : "Room changes are waiting to save."}
                </p>
                {saveStatus === "error" && (
                    <>
                        <p className="text-sm break-words whitespace-pre-wrap">{saveError}</p>
                        <p className="text-xs">Your changes are still here. Retry before leaving this room.</p>
                    </>
                )}
            </div>
            {onRetrySave && (saveStatus === "error" || saveStatus === "saving") && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saveStatus === "saving"}
                    onClick={() => void onRetrySave()}
                    aria-label="Retry saving room"
                    className="self-start"
                >
                    {saveStatus === "saving" ? "Saving…" : "Retry"}
                </Button>
            )}
        </div>
    );
}
