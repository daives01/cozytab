import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { X, Trash2, Save, PlayCircle, Disc } from "lucide-react";

import type { RoomItem } from "../types";

import { extractYouTubeId } from "../lib/youtube";



interface MusicPlayerModalProps {

  item: RoomItem;

  onClose: () => void;

  onSave: (item: RoomItem) => void;

}



export function MusicPlayerModal({

  item,

  onClose,

  onSave,

}: MusicPlayerModalProps) {

  const [musicUrl, setMusicUrl] = useState(item.musicUrl || "");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {

    if (!musicUrl.trim()) {

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(null);

      setError(null);

      return;

    }



    const videoId = extractYouTubeId(musicUrl);

    if (videoId) {

      // Added moderate branding removal (no autoplay in preview)
      setPreviewUrl(

        `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&enablejsapi=1&modestbranding=1`

      );

      setError(null);

    } else {

      setPreviewUrl(null);

      setError("Invalid YouTube URL");

    }

  }, [musicUrl]);



  const handleSave = () => {

    if (!musicUrl.trim()) {

      setError("Please enter a YouTube URL.");

      return;

    }

    if (!extractYouTubeId(musicUrl)) {

      setError("Invalid YouTube URL.");

      return;

    }



    const updatedItem: RoomItem = {

      ...item,

      musicUrl: musicUrl.trim(),

      musicType: "youtube",

    };



    onSave(updatedItem);

    onClose();

  };



  const handleClear = () => {

    const updatedItem: RoomItem = {

      ...item,

      musicUrl: undefined,

      musicType: undefined,

    };

    onSave(updatedItem);

    onClose();

  };



  return (

    <div

      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-['Patrick_Hand']"

      onClick={onClose}

    >

      <div

        className="bg-[#fff9e6] border-[6px] border-[#2c2c2c] rounded-xl shadow-2xl w-[90vw] max-w-2xl relative flex flex-col overflow-hidden"

        onClick={(e) => e.stopPropagation()}

      >

        {/* Decorative Header Bar */}

        <div className="absolute top-0 left-0 w-full h-4 bg-[#e07a5f] border-b-2 border-[#2c2c2c]/20" />



        {/* Header */}

        <div className="flex items-center justify-between p-6 pt-10 pb-4">

          <div className="flex flex-col">

            <h2 className="text-4xl font-bold text-[#2c2c2c] tracking-wide flex items-center gap-2">

              <span className="text-[#e07a5f]">♫</span> Now Spinning

            </h2>

            <span className="text-muted-foreground text-lg ml-1">

              Set the room's vibe

            </span>

          </div>

          <Button

            variant="ghost"

            size="icon"

            onClick={onClose}

            className="h-10 w-10 hover:bg-[#e07a5f]/20 rounded-full"

          >

            <X className="h-6 w-6 text-[#2c2c2c]" />

          </Button>

        </div>



        {/* Main Display Area */}

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8">

          

          {/* Visual Presentation: Sleeve + Record */}

          <div className="flex items-center justify-center h-48 py-2 relative">

            

            {/* The Record (Spins behind/next to the cover) */}

            <div 

              className={`absolute transition-all duration-700 ease-out flex items-center justify-center

                ${previewUrl ? "translate-x-16 rotate-12" : "translate-x-0"}

              `}

            >

               {/* Vinyl Disc Graphic */}

               <div className="w-44 h-44 bg-[#1a1a1a] rounded-full shadow-xl border-4 border-[#111] flex items-center justify-center animate-[spin_6s_linear_infinite]">

                  {/* Grooves */}

                  <div className="absolute inset-1 border border-white/5 rounded-full" />

                  <div className="absolute inset-3 border border-white/5 rounded-full" />

                  <div className="absolute inset-6 border border-white/5 rounded-full" />

                  <div className="absolute inset-10 border border-white/5 rounded-full" />

                  

                  {/* Label */}

                  <div className="w-16 h-16 bg-[#e07a5f] rounded-full border-2 border-white/20 flex items-center justify-center">

                    <div className="w-2 h-2 bg-black rounded-full" />

                  </div>

               </div>

            </div>



            {/* The Album Cover (Holds the YouTube Video) */}

            <div 

              className={`relative z-10 w-48 h-48 bg-white border-2 border-[#2c2c2c]/20 shadow-2xl rounded-md overflow-hidden transition-transform duration-500

                ${previewUrl ? "-rotate-2" : "rotate-0 bg-[#e5e5e5] flex items-center justify-center"}

              `}

            >

              {previewUrl && !error ? (

                <iframe

                  src={previewUrl}

                  className="w-full h-full object-cover"

                />

              ) : (

                <div className="flex flex-col items-center text-muted-foreground/50">

                   <Disc className="h-16 w-16 mb-2" />

                   <span className="font-bold text-sm">No Disc</span>

                </div>

              )}

              

              {/* Glossy Overlay for sleeve effect */}

              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

            </div>



          </div>



          {/* Controls Section */}

          <div className="bg-[#f0e6d2] p-6 rounded-xl border-2 border-[#d6cbb5] relative mt-8">

            <div className="absolute -top-3 left-4 bg-[#e07a5f] text-white px-3 py-1 rounded text-sm font-bold shadow-sm transform -rotate-2">

              SIDE A: TRACK URL

            </div>



            <div className="mt-2 space-y-4">

              <div className="relative">

                <PlayCircle className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />

                <Input

                  placeholder="Paste YouTube Link here..."

                  value={musicUrl}

                  onChange={(e) => setMusicUrl(e.target.value)}

                  className="pl-10 bg-white border-2 border-[#d6cbb5] focus-visible:ring-[#e07a5f] h-10 font-sans text-base shadow-inner"

                />

              </div>



              {error && (

                <div className="text-red-500 text-sm font-bold flex items-center gap-2 animate-pulse pl-1">

                  <X className="h-4 w-4" /> {error}

                </div>

              )}

            </div>

          </div>

        </div>



        {/* Footer Actions */}

        <div className="p-6 bg-[#fff0d4] border-t-2 border-[#e6dbc4] flex gap-4">

          {item.musicUrl && (

            <Button

              variant="outline"

              onClick={handleClear}

              className="flex-1 border-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-300 font-bold"

            >

              <Trash2 className="h-4 w-4 mr-2" />

              Eject Disc

            </Button>

          )}



          <Button

            onClick={handleSave}

            disabled={!musicUrl.trim() || !!error}

            className="flex-1 bg-[#2c2c2c] hover:bg-black text-[#fff9e6] border-2 border-transparent font-bold text-lg shadow-md transition-transform active:scale-95"

          >

            <Save className="h-5 w-5 mr-2" />

            Press Vinyl

          </Button>

        </div>

      </div>

    </div>

  );

}
