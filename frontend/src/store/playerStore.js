import { create } from 'zustand';

const usePlayerStore = create((set, get) => ({
  currentBeat: null,
  isPlaying: false,
  audioElement: null,
  duration: 0,
  currentTime: 0,
  
  setCurrentBeat: (beat) => {
    const { currentBeat, audioElement } = get();
    
    // Pause previous if playing
    if (audioElement && currentBeat?.id !== beat?.id) {
      audioElement.pause();
    }
    
    set({ currentBeat: beat, isPlaying: false, currentTime: 0 });
  },
  
  play: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.play();
      set({ isPlaying: true });
    }
  },
  
  pause: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
      set({ isPlaying: false });
    }
  },
  
  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },
  
  setAudioElement: (element) => set({ audioElement: element }),
  
  setDuration: (duration) => set({ duration }),
  
  setCurrentTime: (time) => set({ currentTime: time }),
  
  seek: (time) => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.currentTime = time;
      set({ currentTime: time });
    }
  },
}));

export default usePlayerStore;
