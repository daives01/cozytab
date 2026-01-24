import { useCallback, useRef } from "react";

const SOUNDS = {
  move: "/sounds/chess/Move.mp3",
  capture: "/sounds/chess/Capture.mp3",
} as const;

export function useChessSounds() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((type: keyof typeof SOUNDS) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(SOUNDS[type]);
      audio.volume = 0.5;
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch {
      // Audio playback failed, ignore
    }
  }, []);

  const playMoveSound = useCallback(
    (isCapture: boolean) => {
      playSound(isCapture ? "capture" : "move");
    },
    [playSound]
  );

  return { playMoveSound };
}
