import { useState } from "react";
import { SignedIn } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CatalogItemsTab } from "./CatalogItemsTab";
import { RoomTemplatesTab } from "./RoomTemplatesTab";

type Tab = "items" | "rooms";

export function AdminPage() {
    return (
        <SignedIn>
            <AdminContent />
        </SignedIn>
    );
}

function AdminContent() {
    const isAdmin = useQuery(api.users.isAdmin);
    const [activeTab, setActiveTab] = useState<Tab>("items");

    if (isAdmin === undefined) {
        return (
            <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center gap-6">
                <h1 className="text-6xl font-bold text-[var(--ink-subtle)]">404</h1>
                <p className="text-[var(--ink-subtle)] text-size-lg">Page not found</p>
                <a
                    href="/"
                    className="px-6 py-3 bg-[var(--warning)] text-[var(--ink)] font-medium rounded-lg border-2 border-[var(--ink)] shadow-md hover:shadow-lg active:shadow-sm active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                    Go to Home
                </a>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[var(--paper)] text-[var(--ink)] overflow-y-auto">
            <div className="max-w-6xl mx-auto p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-size-3xl font-bold text-[var(--ink)]">Admin Dashboard</h1>
                        <p className="text-[var(--ink-subtle)] mt-1">Manage catalog items and room templates</p>
                    </div>
                    <a
                        href="/"
                        className="px-4 py-2 bg-[var(--paper-header)] text-[var(--ink)] rounded-lg border-2 border-[var(--ink)] shadow-sm hover:shadow-md active:shadow-xs active:translate-x-[1px] active:translate-y-[1px] transition-all"
                    >
                        ← Back
                    </a>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b-2 border-[var(--ink)]">
                    <button
                        onClick={() => setActiveTab("items")}
                        className={`px-4 py-2 font-semibold transition-all border-b-2 ${
                            activeTab === "items"
                                ? "text-[var(--ink)] border-[var(--ink)]"
                                : "text-[var(--ink-subtle)] border-transparent hover:text-[var(--ink)]"
                        }`}
                    >
                        Catalog Items
                    </button>
                    <button
                        onClick={() => setActiveTab("rooms")}
                        className={`px-4 py-2 font-semibold transition-all border-b-2 ${
                            activeTab === "rooms"
                                ? "text-[var(--ink)] border-[var(--ink)]"
                                : "text-[var(--ink-subtle)] border-transparent hover:text-[var(--ink)]"
                        }`}
                    >
                        Room Templates
                    </button>
                </div>

                {activeTab === "items" ? <CatalogItemsTab /> : <RoomTemplatesTab />}
            </div>
        </div>
    );
}
