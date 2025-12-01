import { useState } from "react";

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

  Save

} from "lucide-react";

import type { Shortcut } from "../types";



interface ComputerScreenProps {

  shortcuts: Shortcut[];

  onClose: () => void;

  onUpdateShortcuts: (shortcuts: Shortcut[]) => void;

  onOpenShop: () => void;

}



export function ComputerScreen({

  shortcuts,

  onClose,

  onUpdateShortcuts,

  onOpenShop,

}: ComputerScreenProps) {

  const [isEditing, setIsEditing] = useState(false);

  const [newShortcutName, setNewShortcutName] = useState("");

  const [newShortcutUrl, setNewShortcutUrl] = useState("");



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

        <div className="absolute bottom-3 right-8 flex items-center gap-2">

          <span className="text-stone-400 font-bold text-xs uppercase tracking-widest">CozySys 98</span>

          <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />

        </div>



        {/* The Screen (CRT Container) */}

        <div className="bg-stone-800 rounded-xl p-1 overflow-hidden h-[60vh] max-h-[500px] shadow-inner relative border-2 border-stone-400/50">



          {/* OS Desktop Environment */}

          <div className="w-full h-full bg-[#008080] flex flex-col relative overflow-hidden">



            {/* Title Bar */}

            <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-1 px-2 flex items-center justify-between select-none shadow-sm">

              <div className="flex items-center gap-2">

                <Monitor className="h-4 w-4" />

                <span className="font-bold tracking-wide text-sm">My Computer</span>

              </div>

              <button

                onClick={onClose}

                className="bg-stone-200 text-black hover:bg-red-500 hover:text-white transition-colors p-0.5 rounded-sm border border-stone-400 w-5 h-5 flex items-center justify-center shadow-sm"

              >

                <X className="h-3 w-3" />

              </button>

            </div>



            {/* Desktop Icons Area */}

            <div className="flex-1 p-6 grid grid-cols-4 md:grid-cols-6 gap-6 content-start overflow-y-auto">



              {/* Shop Icon */}

              <div

                onClick={onOpenShop}

                className="group flex flex-col items-center gap-1 cursor-pointer w-20"

              >

                <div className="w-12 h-12 bg-white/10 group-hover:bg-white/20 border border-white/0 group-hover:border-white/40 rounded-lg flex items-center justify-center transition-all shadow-sm">

                  <ShoppingBag className="h-7 w-7 text-yellow-300 drop-shadow-md" />

                </div>

                <span className="text-white text-center text-sm drop-shadow-md bg-blue-900/0 group-hover:bg-blue-900/50 px-1 rounded truncate w-full">

                  Item Shop

                </span>

              </div>



              {/* User Shortcuts */}

              {shortcuts.map((shortcut) => (

                <div

                  key={shortcut.id}

                  className="relative group flex flex-col items-center gap-1 cursor-pointer w-20"

                >

                  <button

                    onClick={() => handleOpenShortcut(shortcut.url)}

                    className="flex flex-col items-center w-full"

                  >

                    <div className="w-12 h-12 bg-white/10 group-hover:bg-white/20 border border-white/0 group-hover:border-white/40 rounded-lg flex items-center justify-center transition-all shadow-sm relative">

                      <Globe className="h-7 w-7 text-cyan-200 drop-shadow-md" />

                      {isEditing && (

                        <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-sm hover:scale-110 transition-transform z-10"

                          onClick={(e) => {

                            e.stopPropagation();

                            handleDeleteShortcut(shortcut.id);

                          }}

                        >

                          <Trash2 className="h-3 w-3 text-white" />

                        </div>

                      )}

                    </div>

                    <span className="text-white text-center text-sm drop-shadow-md bg-blue-900/0 group-hover:bg-blue-900/50 px-1 rounded truncate w-full mt-1">

                      {shortcut.name}

                    </span>

                  </button>

                </div>

              ))}

            </div>



            {/* Taskbar / Control Panel */}

            <div className="bg-stone-200 border-t-2 border-white/50 p-2 shadow-[0_-2px_4px_rgba(0,0,0,0.1)] text-stone-800">



              {!isEditing ? (

                <div className="flex justify-between items-center">

                  <div className="text-xs text-stone-500 font-mono pl-2">

                    Ready

                  </div>

                  <Button

                    variant="outline"

                    size="sm"

                    onClick={() => setIsEditing(true)}

                    className="h-8 bg-stone-100 hover:bg-white border-stone-400 shadow-sm active:translate-y-px text-xs font-sans"

                  >

                    <Settings className="h-3 w-3 mr-2" />

                    Manage Shortcuts

                  </Button>

                </div>

              ) : (

                <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2">

                  <div className="flex gap-2 items-center">

                    <Input

                      placeholder="Name"

                      value={newShortcutName}

                      onChange={(e) => setNewShortcutName(e.target.value)}

                      className="h-8 text-xs bg-white font-mono border-stone-400"

                    />

                    <Input

                      placeholder="URL"

                      value={newShortcutUrl}

                      onChange={(e) => setNewShortcutUrl(e.target.value)}

                      className="h-8 text-xs bg-white font-mono border-stone-400"

                    />

                    <Button

                      size="sm"

                      onClick={handleAddShortcut}

                      disabled={!newShortcutName.trim() || !newShortcutUrl.trim()}

                      className="h-8 bg-blue-700 hover:bg-blue-600 text-white shadow-sm"

                    >

                      <Plus className="h-3 w-3" />

                    </Button>

                  </div>

                  <Button

                    variant="ghost"

                    size="sm"

                    onClick={() => setIsEditing(false)}

                    className="h-6 text-xs text-stone-600 hover:text-stone-900 self-center"

                  >

                    <Save className="h-3 w-3 mr-1" />

                    Save & Close Manager

                  </Button>

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

