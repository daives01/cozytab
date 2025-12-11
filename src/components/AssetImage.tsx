import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface AssetImageProps {
    assetUrl: string;
    alt?: string;
    className?: string;
    draggable?: boolean;
    style?: React.CSSProperties;
}

export function AssetImage({ assetUrl, alt = "", className, draggable, style }: AssetImageProps) {
    const isStorageUrl = assetUrl?.startsWith("storage:");
    const storageId = isStorageUrl ? assetUrl.replace("storage:", "") : null;
    const resolvedUrl = useQuery(
        api.catalog.getImageUrl,
        storageId ? { storageId: storageId as Id<"_storage"> } : "skip"
    );

    const src = isStorageUrl ? resolvedUrl : assetUrl;

    if (!src) {
        return <div className={`${className} bg-gray-200 animate-pulse`} style={style} />;
    }

    return <img src={src} alt={alt} className={className} draggable={draggable} style={style} />;
}

