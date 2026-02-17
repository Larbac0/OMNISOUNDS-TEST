import { create } from 'zustand';

const PREVIEW_DURATION = 30; // 30 seconds preview for non-purchased beats

const usePlayerStore = create((set, get) => ({
  currentBeat: null,
  isPlaying: false,
  audioElement: null,
  duration: 0,
  currentTime: 0,
  isPreviewMode: true, // Default to preview mode
  previewEnded: false,
  purchasedBeatIds: [], // IDs of beats the user has purchased
  
  setCurrentBeat: (beat) => {
    const { currentBeat, audioElement, purchasedBeatIds } = get();
    
    // Pause previous if playing
    if (audioElement && currentBeat?.id !== beat?.id) {
      audioElement.pause();
    }
    
    // Check if beat is purchased
    const isPurchased = purchasedBeatIds.includes(beat?.id);
    
    set({ 
      currentBeat: beat, 
      isPlaying: false, 
      currentTime: 0,
      isPreviewMode: !isPurchased,
      previewEnded: false
    });
  },
  
  play: () => {
    const { audioElement, previewEnded, isPreviewMode } = get();
    if (audioElement && !previewEnded) {
      audioElement.play();
      set({ isPlaying: true });
    } else if (previewEnded && isPreviewMode) {
      // Reset to start if preview ended
      audioElement.currentTime = 0;
      set({ previewEnded: false, currentTime: 0 });
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
  
  setCurrentTime: (time) => {
    const { isPreviewMode, audioElement } = get();
    
    // Check if preview limit reached
    if (isPreviewMode && time >= PREVIEW_DURATION) {
      if (audioElement) {
        audioElement.pause();
      }
      set({ currentTime: PREVIEW_DURATION, isPlaying: false, previewEnded: true });
      return;
    }
    
    set({ currentTime: time });
  },
  
  seek: (time) => {
    const { audioElement, isPreviewMode } = get();
    if (audioElement) {
      // Limit seek to preview duration in preview mode
      const targetTime = isPreviewMode ? Math.min(time, PREVIEW_DURATION) : time;
      audioElement.currentTime = targetTime;
      set({ currentTime: targetTime, previewEnded: false });
    }
  },
  
  // Set purchased beat IDs (called after fetching user's orders)
  setPurchasedBeatIds: (ids) => set({ purchasedBeatIds: ids }),
  
  // Add a purchased beat ID
  addPurchasedBeatId: (id) => set((state) => ({ 
    purchasedBeatIds: [...state.purchasedBeatIds, id] 
  })),
  
  // Get effective duration (preview or full)
  getEffectiveDuration: () => {
    const { duration, isPreviewMode } = get();
    return isPreviewMode ? Math.min(duration, PREVIEW_DURATION) : duration;
  },
  
  // Check if current beat is in preview mode
  getIsPreviewMode: () => get().isPreviewMode,
  
  PREVIEW_DURATION,
}));

export default usePlayerStore;
