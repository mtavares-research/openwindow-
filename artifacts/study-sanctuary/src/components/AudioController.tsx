import { useState, useEffect } from "react";
import { Volume2, VolumeX, Music } from "lucide-react";
import { audioSystem } from "@/lib/audio";
import { Slider } from "@/components/ui/slider";

export function AudioController() {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isMuted) {
      audioSystem.startAmbient();
      audioSystem.setVolume(volume[0] / 100);
    } else {
      audioSystem.stopAmbient();
    }
  }, [isMuted, volume]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end flex-col gap-2">
      {isOpen && (
        <div className="glass p-4 rounded-xl mb-2 w-48 flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center justify-between text-sm font-medium">
            <div className="flex items-center gap-2">
              <Music size={16} />
              <span>Ambience</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <VolumeX size={16} className="text-muted-foreground" />
            <Slider 
              value={volume} 
              onValueChange={setVolume} 
              max={100} 
              step={1}
              className="flex-1"
            />
            <Volume2 size={16} className="text-muted-foreground" />
          </div>
        </div>
      )}
      
      <button 
        className="glass-button p-4 rounded-full flex items-center justify-center shadow-lg"
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen && isMuted) {
            setIsMuted(false);
          }
        }}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </div>
  );
}
