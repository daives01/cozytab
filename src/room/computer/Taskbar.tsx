import {
    Clock3,
    Home,
    Info,
    Monitor,
    ShoppingBag,
    User,
    UserPlus,
    X,
} from "lucide-react";

interface TaskbarProps {
    nowLabel: string;
    isStartMenuOpen: boolean;
    isOnboardingShopStep?: boolean;
    isDevEnv: boolean;
    canEditDisplayName: boolean;
    onToggleStartMenu: () => void;
    onCloseStartMenu: () => void;
    onOpenShop: () => void;
    onOpenRooms: () => void;
    onOpenInvite: () => void;
    onOpenAbout: () => void;
    onOpenProfile: () => void;
    onLogout: () => void;
    onShutdown: () => void;
    onResetStorage: () => void;
    onDeleteAccount: () => void;
}

export function Taskbar({
    nowLabel,
    isStartMenuOpen,
    isOnboardingShopStep,
    isDevEnv,
    canEditDisplayName,
    onToggleStartMenu,
    onCloseStartMenu,
    onOpenShop,
    onOpenRooms,
    onOpenInvite,
    onOpenAbout,
    onOpenProfile,
    onLogout,
    onShutdown,
    onResetStorage,
    onDeleteAccount,
}: TaskbarProps) {
    return (
        <div className="bg-gradient-to-b from-stone-300 to-stone-200 border-t-2 border-white p-1.5 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] text-stone-800 relative">
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleStartMenu();
                    }}
                    aria-label="User menu"
                    className="flex items-center justify-center bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-200 hover:to-gray-300 px-3 py-1.5 rounded border-2 border-t-white border-l-white border-b-gray-600 border-r-gray-600 shadow-sm active:border-t-gray-600 active:border-l-gray-600 active:border-b-white active:border-r-white active:translate-y-[1px] transition-all"
                >
                    <User className="h-5 w-5 text-gray-800" />
                </button>

                <div className="flex items-center gap-2 h-8">
                    <button
                        data-onboarding="shop-icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseStartMenu();
                            onOpenShop();
                        }}
                        title="Shop"
                        aria-label="Shop"
                        className={`flex items-center justify-center h-full aspect-square bg-white/70 hover:bg-white px-2 rounded border border-stone-300 shadow-sm active:translate-y-[1px] transition-all ${
                            isOnboardingShopStep
                                ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-stone-200 animate-pulse"
                                : ""
                        }`}
                    >
                        <ShoppingBag className="h-5 w-5 text-amber-600" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseStartMenu();
                            onOpenRooms();
                        }}
                        title="Rooms"
                        aria-label="Rooms"
                        className="flex items-center justify-center h-full aspect-square bg-white/70 hover:bg-white px-2 rounded border border-stone-300 shadow-sm active:translate-y-[1px] transition-all"
                    >
                        <Home className="h-5 w-5 text-emerald-600" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseStartMenu();
                            onOpenInvite();
                        }}
                        title="Invite"
                        aria-label="Invite"
                        className="flex items-center justify-center h-full aspect-square bg-white/70 hover:bg-white px-2 rounded border border-stone-300 shadow-sm active:translate-y-[1px] transition-all"
                    >
                        <UserPlus className="h-5 w-5 text-pink-600" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseStartMenu();
                            onOpenAbout();
                        }}
                        title="About"
                        aria-label="About"
                        className="flex items-center justify-center h-full aspect-square bg-white/70 hover:bg-white px-2 rounded border border-stone-300 shadow-sm active:translate-y-[1px] transition-all"
                    >
                        <Info className="h-5 w-5 text-indigo-600" />
                    </button>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-2 bg-stone-300/70 border border-stone-400/60 rounded px-2 py-1 shadow-inner">
                    <Clock3 className="h-4 w-4 text-stone-600" />
                    <span className="font-mono text-sm text-stone-700">{nowLabel}</span>
                </div>
            </div>

            {isStartMenuOpen && (
                <div
                    className="absolute bottom-12 left-2 w-52 bg-white border-2 border-stone-300 shadow-xl rounded-md overflow-hidden z-[70]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col divide-y divide-stone-200">
                        {canEditDisplayName && (
                            <button
                                className="text-left px-3 py-2 hover:bg-stone-100 text-sm text-stone-800"
                                onClick={() => {
                                    onCloseStartMenu();
                                    onOpenProfile();
                                }}
                            >
                                Update display name
                            </button>
                        )}
                        <button
                            className="text-left px-3 py-2 hover:bg-stone-100 text-sm text-stone-800"
                            onClick={onLogout}
                        >
                            Log out
                        </button>
                        <button
                            className="text-left px-3 py-2 hover:bg-stone-100 text-sm text-stone-800"
                            onClick={onShutdown}
                        >
                            Shut down
                        </button>
                        {isDevEnv && (
                            <div className="flex flex-col">
                                <button
                                    className="text-left px-3 py-2 hover:bg-amber-50 text-sm text-amber-800"
                                    onClick={onResetStorage}
                                >
                                    Reset local storage
                                </button>
                                <button
                                    className="text-left px-3 py-2 hover:bg-red-50 text-sm text-red-700"
                                    onClick={onDeleteAccount}
                                >
                                    Delete account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function WindowHeader({ onClose }: { onClose: () => void }) {
    return (
        <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900 text-white py-1.5 px-3 flex items-center justify-between select-none shadow-md">
            <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-100" />
                <span className="font-bold tracking-wide text-sm drop-shadow-sm">Cozy Computer</span>
            </div>
            <button
                onClick={onClose}
                className="bg-gradient-to-b from-stone-200 to-stone-300 text-stone-600 hover:from-red-400 hover:to-red-500 hover:text-white transition-all p-0.5 rounded-sm border-2 border-t-white border-l-white border-b-stone-400 border-r-stone-400 w-7 h-7 flex items-center justify-center shadow-sm"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
