import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Plus,
  ShoppingBag,
  Globe,
  Trash2,
  Monitor,
  Settings,
  LogOut,
  UserPlus,
  Copy,
  Check,
  Gift,
  Home,
  CheckCircle2,
} from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import type { Shortcut } from "../types";
import type { Id } from "../../convex/_generated/dataModel";
import { AssetImage } from "../components/AssetImage";

// Get favicon URL from a website URL
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

// Favicon component with fallback to Globe icon
function SiteFavicon({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = getFaviconUrl(url);

  if (failed || !faviconUrl) {
    return <Globe className={className} />;
  }

  return (
    <img
      src={faviconUrl}
      alt=""
      onError={() => setFailed(true)}
      className={className}
      draggable={false}
    />
  );
}

interface ComputerScreenProps {
  shortcuts: Shortcut[];
  onClose: () => void;
  onUpdateShortcuts: (shortcuts: Shortcut[]) => void;
  onOpenShop: () => void;
  isOnboardingShopStep?: boolean; // For onboarding highlighting
}

export function ComputerScreen({
  shortcuts,
  onClose,
  onUpdateShortcuts,
  onOpenShop,
  isOnboardingShopStep,
}: ComputerScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState("");
  const [newShortcutUrl, setNewShortcutUrl] = useState("");
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showRoomsPanel, setShowRoomsPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const { signOut } = useClerk();
  const referralCode = useQuery(api.users.getMyReferralCode);
  const referralUrl = referralCode ? `${window.location.origin}/ref/${referralCode}` : null;
  const myRooms = useQuery(api.rooms.getMyRooms);
  const setActiveRoom = useMutation(api.rooms.setActiveRoom);
  const [switchingRoom, setSwitchingRoom] = useState<Id<"rooms"> | null>(null);

  const handleCopyReferral = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddShortcut = () => {
    if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;

    // Auto-prefix protocol if missing
    let url = newShortcutUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const newShortcut: Shortcut = {
      id: crypto.randomUUID(),
      name: newShortcutName.trim(),
      url: url,
    };

    onUpdateShortcuts([...shortcuts, newShortcut]);
    setNewShortcutName("");
    setNewShortcutUrl("");
  };

  const handleDeleteShortcut = (id: string) => {
    onUpdateShortcuts(shortcuts.filter((s) => s.id !== id));
  };

  const handleOpenShortcut = (url: string) => {
    if (!isEditing) window.open(url, "_blank");
  };

  const handleSwitchRoom = async (roomId: Id<"rooms">) => {
    setSwitchingRoom(roomId);
    try {
      await setActiveRoom({ roomId });
      setShowRoomsPanel(false);
      onClose();
    } catch (error) {
      console.error("Failed to switch room:", error);
    } finally {
      setSwitchingRoom(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-['Patrick_Hand']"
      onClick={onClose}
    >
      {/* Physical Monitor Bezel */}
      <div
        className="relative bg-stone-200 rounded-3xl p-6 shadow-2xl w-[90vw] max-w-4xl max-h-[700px] border-b-8 border-r-8 border-stone-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Monitor Branding / Power Light */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-stone-300/80 px-4 py-1 rounded-t-lg">
          <span className="text-stone-500 font-bold text-[10px] uppercase tracking-[0.2em]">COZYSYS 98</span>
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />
        </div>

        {/* The Screen (CRT Container) */}
        <div className="bg-stone-800 rounded-xl p-1 overflow-hidden h-[60vh] max-h-[500px] shadow-inner relative border-2 border-stone-400/50">

          {/* OS Desktop Environment */}
          <div className="w-full h-full bg-[#008080] flex flex-col relative overflow-hidden">

            {/* Title Bar */}
            <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 text-white py-1.5 px-2 flex items-center justify-between select-none shadow-md">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-200" />
                <span className="font-bold tracking-wide text-sm drop-shadow-sm">My Computer</span>
              </div>
              <button
                onClick={onClose}
                className="bg-gradient-to-b from-stone-200 to-stone-300 text-stone-600 hover:from-red-400 hover:to-red-500 hover:text-white transition-all p-0.5 rounded-sm border-2 border-t-white border-l-white border-b-stone-400 border-r-stone-400 w-6 h-6 flex items-center justify-center shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Desktop Icons Area */}
            <div className="flex-1 p-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-4 gap-y-6 content-start overflow-y-auto">

              {/* Shop Icon */}
              <div
                data-onboarding="shop-icon"
                onClick={onOpenShop}
                className={`group flex flex-col items-center gap-2 cursor-pointer ${isOnboardingShopStep ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent rounded-lg" : ""
                  }`}
              >
                <div className={`w-16 h-16 bg-white/10 group-hover:bg-white/20 group-hover:scale-105 border group-hover:border-white/40 rounded-xl flex items-center justify-center transition-all shadow-lg ${isOnboardingShopStep ? "border-amber-400 animate-pulse" : "border-white/20"
                  }`}>
                  <ShoppingBag className="h-9 w-9 text-yellow-300 drop-shadow-md" />
                </div>
                <span className="text-white text-center text-sm leading-tight drop-shadow-md bg-blue-900/0 group-hover:bg-blue-900/60 px-2 py-0.5 rounded max-w-[90px] line-clamp-2">
                  Item Shop
                </span>
              </div>

              {/* My Rooms Icon */}
              <div
                onClick={() => setShowRoomsPanel(true)}
                className="group flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-16 h-16 bg-white/10 group-hover:bg-white/20 group-hover:scale-105 border border-white/20 group-hover:border-white/40 rounded-xl flex items-center justify-center transition-all shadow-lg">
                  <Home className="h-9 w-9 text-emerald-300 drop-shadow-md" />
                </div>
                <span className="text-white text-center text-sm leading-tight drop-shadow-md bg-blue-900/0 group-hover:bg-blue-900/60 px-2 py-0.5 rounded max-w-[90px] line-clamp-2">
                  My Rooms
                </span>
              </div>

              {/* Invite Friends Icon */}
              <div
                onClick={() => setShowInvitePanel(true)}
                className="group flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-16 h-16 bg-white/10 group-hover:bg-white/20 group-hover:scale-105 border border-white/20 group-hover:border-white/40 rounded-xl flex items-center justify-center transition-all shadow-lg">
                  <UserPlus className="h-9 w-9 text-pink-300 drop-shadow-md" />
                </div>
                <span className="text-white text-center text-sm leading-tight drop-shadow-md bg-blue-900/0 group-hover:bg-blue-900/60 px-2 py-0.5 rounded max-w-[90px] line-clamp-2">
                  Invite Friends
                </span>
              </div>

              {/* User Shortcuts */}
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="relative group flex flex-col items-center gap-2 cursor-pointer"
                >
                  <button
                    onClick={() => handleOpenShortcut(shortcut.url)}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 bg-white/10 group-hover:bg-white/20 group-hover:scale-105 border border-white/20 group-hover:border-white/40 rounded-xl flex items-center justify-center transition-all shadow-lg relative">
                      <SiteFavicon url={shortcut.url} className="h-9 w-9 text-cyan-200 drop-shadow-md rounded" />
                      {isEditing && (
                        <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-md hover:scale-110 transition-transform z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteShortcut(shortcut.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-white text-center text-sm leading-tight drop-shadow-md bg-blue-900/0 group-hover:bg-blue-900/60 px-2 py-0.5 rounded max-w-[90px] line-clamp-2 break-words mt-1">
                      {shortcut.name}
                    </span>
                  </button>
                </div>
              ))}
            </div>

            {/* My Rooms Panel */}
            {showRoomsPanel && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <div className="bg-stone-100 rounded-lg shadow-xl border-2 border-stone-300 w-96 max-h-[400px] overflow-hidden flex flex-col">
                  {/* Panel Title Bar */}
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-1 px-2 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span className="font-bold text-sm">My Rooms</span>
                    </div>
                    <button
                      onClick={() => setShowRoomsPanel(false)}
                      className="bg-stone-200 text-black hover:bg-red-500 hover:text-white transition-colors p-0.5 rounded-sm border border-stone-400 w-5 h-5 flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="p-3 space-y-2 overflow-y-auto flex-1">
                    {!myRooms ? (
                      <div className="text-center py-4 text-stone-500">Loading rooms...</div>
                    ) : myRooms.length === 0 ? (
                      <div className="text-center py-4 text-stone-500">
                        <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No rooms yet!</p>
                        <p className="text-xs mt-1">Visit the shop to buy new rooms.</p>
                      </div>
                    ) : (
                      myRooms.map((room) => {
                        const isActive = room.isActive;
                        const isSwitching = switchingRoom === room._id;
                        
                        return (
                          <button
                            key={room._id}
                            onClick={() => !isActive && handleSwitchRoom(room._id)}
                            disabled={isActive || isSwitching}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg border-2 transition-all text-left ${
                              isActive
                                ? "bg-emerald-50 border-emerald-400 cursor-default"
                                : isSwitching
                                ? "bg-stone-100 border-stone-300 cursor-wait opacity-70"
                                : "bg-white border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer"
                            }`}
                          >
                            {/* Room Thumbnail */}
                            <div className="w-16 h-10 rounded overflow-hidden bg-stone-200 shrink-0">
                              {room.template?.backgroundUrl && (
                                <AssetImage
                                  assetUrl={room.template.backgroundUrl}
                                  alt={room.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>

                            {/* Room Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-stone-700 truncate text-sm">
                                {room.name}
                              </div>
                              <div className="text-xs text-stone-500">
                                {room.items.length} item{room.items.length !== 1 ? 's' : ''}
                              </div>
                            </div>

                            {/* Active Indicator */}
                            {isActive && (
                              <div className="flex items-center gap-1 text-emerald-600 shrink-0">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="text-xs font-bold">Active</span>
                              </div>
                            )}
                            {isSwitching && (
                              <div className="text-stone-400 text-xs shrink-0">
                                Switching...
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-stone-200 border-t border-stone-300 px-3 py-2 text-xs text-stone-500 text-center shrink-0">
                    Buy more rooms from the Item Shop!
                  </div>
                </div>
              </div>
            )}

            {/* Invite Friends Panel */}
            {showInvitePanel && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <div className="bg-stone-100 rounded-lg shadow-xl border-2 border-stone-300 w-80 overflow-hidden">
                  {/* Panel Title Bar */}
                  <div className="bg-gradient-to-r from-pink-600 to-pink-500 text-white p-1 px-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span className="font-bold text-sm">Invite Friends</span>
                    </div>
                    <button
                      onClick={() => setShowInvitePanel(false)}
                      className="bg-stone-200 text-black hover:bg-red-500 hover:text-white transition-colors p-0.5 rounded-sm border border-stone-400 w-5 h-5 flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-stone-700 text-sm">
                      <Gift className="h-5 w-5 text-pink-500" />
                      <span>Earn <strong>1 token</strong> when friends join!</span>
                    </div>

                    {referralUrl ? (
                      <div className="space-y-2">
                        <div className="text-xs text-stone-500 font-medium">Your invite link:</div>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={referralUrl}
                            className="h-8 text-xs bg-white font-mono border-stone-400 flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={handleCopyReferral}
                            className={`h-8 px-3 transition-colors ${copied
                              ? "bg-green-600 hover:bg-green-600"
                              : "bg-pink-600 hover:bg-pink-500"
                              }`}
                          >
                            {copied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {copied && (
                          <div className="text-xs text-green-600 font-medium">
                            Copied to clipboard!
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-stone-500">Loading...</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Taskbar */}
            <div className="bg-gradient-to-b from-stone-300 to-stone-200 border-t-2 border-white p-1.5 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] text-stone-800">

              {!isEditing ? (
                <div className="flex justify-between items-center gap-3">
                  {/* Start-style button */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-gradient-to-b from-stone-100 to-stone-200 hover:from-white hover:to-stone-100 px-3 py-1.5 rounded border-2 border-t-white border-l-white border-b-stone-400 border-r-stone-400 shadow-sm active:border-t-stone-400 active:border-l-stone-400 active:border-b-white active:border-r-white active:bg-stone-300 transition-all"
                  >
                    <Settings className="h-4 w-4 text-stone-600" />
                    <span className="text-sm font-semibold text-stone-700">Shortcuts</span>
                  </button>

                  {/* Spacer with status */}
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs text-stone-400 font-mono">{shortcuts.length} shortcut{shortcuts.length !== 1 ? 's' : ''}</span>
                  </div>

                  {/* System tray area */}
                  <div className="flex items-center gap-1 bg-stone-300/50 border border-stone-400/50 rounded px-2 py-1">
                    <button
                      onClick={() => signOut()}
                      className="p-1 hover:bg-stone-400/30 rounded transition-colors group"
                      title="Log Out"
                    >
                      <LogOut className="h-4 w-4 text-stone-500 group-hover:text-red-500 transition-colors" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-200">
                  {/* Add shortcut row */}
                  <div className="flex gap-2 items-center bg-white/50 p-2 rounded border border-stone-300">
                    <Plus className="h-4 w-4 text-stone-400 shrink-0" />
                    <Input
                      placeholder="Shortcut name"
                      value={newShortcutName}
                      onChange={(e) => setNewShortcutName(e.target.value)}
                      className="h-8 text-sm bg-white border-stone-300 focus:border-blue-400 flex-1"
                    />
                    <Input
                      placeholder="https://..."
                      value={newShortcutUrl}
                      onChange={(e) => setNewShortcutUrl(e.target.value)}
                      className="h-8 text-sm bg-white border-stone-300 focus:border-blue-400 flex-[1.5]"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddShortcut}
                      disabled={!newShortcutName.trim() || !newShortcutUrl.trim()}
                      className="h-8 px-4 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-sm border border-blue-700 disabled:opacity-50"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Bottom controls */}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-2 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-4 py-1.5 rounded border border-emerald-700 shadow-sm transition-all text-sm font-medium"
                    >
                      <Check className="h-4 w-4" />
                      Done Editing
                    </button>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-500">Click delete icons on shortcuts to remove</span>
                      <button
                        onClick={() => signOut()}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors group border border-transparent hover:border-red-200"
                        title="Log Out"
                      >
                        <LogOut className="h-4 w-4 text-stone-400 group-hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Screen Glare Overlay (Optional) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg" />
        </div>
      </div>
    </div>
  );
}
