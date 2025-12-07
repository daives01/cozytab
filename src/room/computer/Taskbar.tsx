import type { MouseEvent, ReactNode } from "react";
import {
    Clock3,
    Home,
    Info,
    Monitor,
    ShoppingBag,
    User,
    UserCircle,
    UserPlus,
    X,
} from "lucide-react";

interface TaskbarProps {
    nowLabel: string;
    isStartMenuOpen: boolean;
    isOnboardingShopStep?: boolean;
    isDevEnv: boolean;
    onToggleStartMenu: () => void;
    onCloseStartMenu: () => void;
    onOpenShop: () => void;
    onOpenRooms: () => void;
    onOpenInvite: () => void;
    onOpenAbout: () => void;
    onOpenCustomize: () => void;
    onLogout: () => void;
    onShutdown: () => void;
    onResetStorage: () => void;
    onDeleteAccount: () => void;
}

function TaskbarTooltip({ label }: { label: string }) {
    return (
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gradient-to-b from-[var(--tooltip-from)] to-[var(--tooltip-to)] text-[var(--ink)] text-[11px] font-medium px-2.5 py-1 shadow-[var(--tooltip-shadow)] border border-[var(--taskbar-border)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-0 transition-opacity duration-75">
            {label}
        </span>
    );
}

interface TaskbarIconButtonProps {
    label: string;
    onClick: () => void;
    children: ReactNode;
    className?: string;
    dataOnboarding?: string;
    ariaLabel?: string;
}

function TaskbarIconButton({
    label,
    onClick,
    children,
    className,
    dataOnboarding,
    ariaLabel,
}: TaskbarIconButtonProps) {
    return (
        <div className="relative group h-full">
            <button
                data-onboarding={dataOnboarding}
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onClick();
                }}
                aria-label={ariaLabel ?? label}
                className={`flex items-center justify-center h-full aspect-square bg-[color-mix(in_srgb,var(--card)_80%,transparent)] hover:bg-[var(--card)] px-2 rounded border border-[var(--taskbar-border)] shadow-sm active:translate-y-[1px] transition-all ${className ?? ""}`}
            >
                {children}
            </button>
            <TaskbarTooltip label={label} />
        </div>
    );
}

export function Taskbar({
    nowLabel,
    isStartMenuOpen,
    isOnboardingShopStep,
    isDevEnv,
    onToggleStartMenu,
    onCloseStartMenu,
    onOpenShop,
    onOpenRooms,
    onOpenInvite,
    onOpenAbout,
    onOpenCustomize,
    onLogout,
    onShutdown,
    onResetStorage,
    onDeleteAccount,
}: TaskbarProps) {
    return (
        <div className="bg-gradient-to-b from-[var(--taskbar-from)] to-[var(--taskbar-to)] border-t-2 border-[var(--taskbar-border)] p-1.5 px-2 shadow-[inset_0_1px_0_var(--tooltip-to)] text-[var(--ink)] relative">
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleStartMenu();
                    }}
                    aria-label="User menu"
                    className="flex items-center justify-center px-3 py-1.5 rounded border-2 shadow-sm active:translate-y-[1px] transition-all text-[var(--ink)]"
                    style={{
                        backgroundImage:
                            "linear-gradient(180deg, color-mix(in srgb, var(--taskbar-to) 90%, var(--primary-foreground)), color-mix(in srgb, var(--taskbar-from) 95%, var(--taskbar-border)))",
                        borderTopColor: "var(--taskbar-border)",
                        borderLeftColor: "var(--taskbar-border)",
                        borderBottomColor: "color-mix(in srgb, var(--ink) 35%, transparent)",
                        borderRightColor: "color-mix(in srgb, var(--ink) 35%, transparent)",
                    }}
                >
                    <User className="h-5 w-5 text-[var(--ink)]" />
                </button>

                <div className="flex items-center gap-2 h-8">
                    <TaskbarIconButton
                        dataOnboarding="shop-icon"
                        label="Shop"
                        ariaLabel="Shop"
                        onClick={() => {
                            onCloseStartMenu();
                            onOpenShop();
                        }}
                        className={
                            isOnboardingShopStep
                                ? "ring-2 ring-[var(--warning-light)] ring-offset-1 ring-offset-[var(--taskbar-to)] animate-pulse"
                                : ""
                        }
                    >
                        <ShoppingBag className="h-5 w-5 text-[var(--warning)]" />
                    </TaskbarIconButton>

                    <TaskbarIconButton
                        label="Rooms"
                        ariaLabel="Rooms"
                        onClick={() => {
                            onCloseStartMenu();
                            onOpenRooms();
                        }}
                    >
                        <Home className="h-5 w-5 text-[var(--success-dark)]" />
                    </TaskbarIconButton>

                    <TaskbarIconButton
                        label="Invite"
                        ariaLabel="Invite"
                        onClick={() => {
                            onCloseStartMenu();
                            onOpenInvite();
                        }}
                    >
                        <UserPlus className="h-5 w-5 text-[var(--chart-5)]" />
                    </TaskbarIconButton>

                    <TaskbarIconButton
                        label="Customize"
                        ariaLabel="Customize"
                        onClick={() => {
                            onCloseStartMenu();
                            onOpenCustomize();
                        }}
                    >
                        <UserCircle className="h-5 w-5 text-[var(--warning-dark)]" />
                    </TaskbarIconButton>

                    <TaskbarIconButton
                        label="About"
                        ariaLabel="About"
                        onClick={() => {
                            onCloseStartMenu();
                            onOpenAbout();
                        }}
                    >
                        <Info className="h-5 w-5 text-[var(--chart-4)]" />
                    </TaskbarIconButton>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-2 bg-[color-mix(in_srgb,var(--taskbar-from)_70%,transparent)] border border-[var(--taskbar-border)] rounded px-2 py-1 shadow-inner">
                    <Clock3 className="h-4 w-4 text-[var(--ink-muted)]" />
                    <span className="font-mono text-sm text-[var(--ink)]">{nowLabel}</span>
                </div>
            </div>

            {isStartMenuOpen && (
                <div
                    className="absolute bottom-12 left-2 w-52 bg-[var(--card)] border-2 border-[var(--taskbar-border)] shadow-xl rounded-md overflow-hidden z-[70]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col divide-y divide-[var(--taskbar-border)]">
                        <button
                            className="text-left px-3 py-2 hover:bg-[var(--muted)] text-sm text-[var(--ink)]"
                            onClick={onLogout}
                        >
                            Log out
                        </button>
                        <button
                            className="text-left px-3 py-2 hover:bg-[var(--muted)] text-sm text-[var(--ink)]"
                            onClick={onShutdown}
                        >
                            Shut down
                        </button>
                        {isDevEnv && (
                            <div className="flex flex-col">
                                <button
                                    className="text-left px-3 py-2 hover:bg-[var(--warning-light)] text-sm text-[var(--warning-dark)]"
                                    onClick={onResetStorage}
                                >
                                    Reset local storage
                                </button>
                                <button
                                    className="text-left px-3 py-2 hover:bg-[var(--danger-light)] text-sm text-[var(--danger-dark)]"
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
        <div className="bg-gradient-to-r from-[color-mix(in_srgb,var(--chart-4)_70%,var(--ink))] via-[var(--chart-4)] to-[color-mix(in_srgb,var(--chart-4)_70%,var(--ink))] text-[var(--primary-foreground)] py-1.5 px-3 flex items-center justify-between select-none shadow-md">
            <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-[color-mix(in_srgb,var(--primary-foreground)_80%,var(--chart-4))]" />
                <span className="font-bold tracking-wide text-sm drop-shadow-sm">Cozy Computer</span>
            </div>
            <button
                onClick={onClose}
                className="bg-gradient-to-b from-[var(--card)] to-[var(--taskbar-to)] text-[var(--ink-subtle)] hover:from-[var(--danger)] hover:to-[var(--danger-dark)] hover:text-[var(--destructive-foreground)] transition-all p-0.5 rounded-sm border-2 border-t-[var(--taskbar-border)] border-l-[var(--taskbar-border)] border-b-[color-mix(in_srgb,var(--ink)_35%,transparent)] border-r-[color-mix(in_srgb,var(--ink)_35%,transparent)] w-7 h-7 flex items-center justify-center shadow-sm"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
