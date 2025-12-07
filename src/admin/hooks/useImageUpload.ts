import { useState } from "react";
import type { Id, TableNames } from "../../../convex/_generated/dataModel";

interface UseImageUploadOptions<T extends TableNames> {
    generateUploadUrl: () => Promise<string>;
    onUploadComplete: (itemId: Id<T> | "new", imageUrl: string) => Promise<void>;
}

export function useImageUpload<T extends TableNames>({ generateUploadUrl, onUploadComplete }: UseImageUploadOptions<T>) {
    const [uploading, setUploading] = useState<Id<T> | "new" | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    const handleImageUpload = async (itemId: Id<T> | "new", file: File) => {
        setUploading(itemId);
        setError(undefined);

        try {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) {
                throw new Error("Upload failed");
            }

            const { storageId } = await result.json();
            const imageUrl = `storage:${storageId}`;
            await onUploadComplete(itemId, imageUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(undefined);
        }
    };

    return { uploading, error, handleImageUpload, setError };
}

