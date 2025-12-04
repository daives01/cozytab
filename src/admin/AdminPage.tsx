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
            <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-6">
                <h1 className="text-6xl font-bold text-stone-400">404</h1>
                <p className="text-stone-400 text-lg">Page not found</p>
                <a
                    href="/"
                    className="px-6 py-3 bg-amber-500 text-stone-900 font-medium rounded hover:bg-amber-400 transition-colors"
                >
                    Go to Home
                </a>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-stone-900 text-stone-100 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-amber-400">Admin Dashboard</h1>
                        <p className="text-stone-400 mt-1">Manage catalog items and room templates</p>
                    </div>
                    <a
                        href="/"
                        className="px-4 py-2 bg-stone-700 text-stone-100 rounded hover:bg-stone-600 transition-colors"
                    >
                        ← Back
                    </a>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b border-stone-700">
                    <button
                        onClick={() => setActiveTab("items")}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === "items"
                                ? "text-amber-400 border-b-2 border-amber-400"
                                : "text-stone-400 hover:text-stone-200"
                        }`}
                    >
                        Catalog Items
                    </button>
                    <button
                        onClick={() => setActiveTab("rooms")}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === "rooms"
                                ? "text-amber-400 border-b-2 border-amber-400"
                                : "text-stone-400 hover:text-stone-200"
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
