import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, Lock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import usePlayerStore from '@/store/playerStore';
import useCartStore from '@/store/cartStore';
import { toast } from 'sonner';

const GlobalPlayer = () => {
  const navigate = useNavigate();
  const {
    currentBeat,
    isPlaying,
    audioElement,
    duration,
    currentTime,
    isPreviewMode,
    previewEnded,
    setAudioElement,
    setDuration,
    setCurrentTime,
    togglePlay,
    seek,
    PREVIEW_DURATION,
  } = usePlayerStore();
  
  const { addItem } = useCartStore();

  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current);
    }
  }, [setAudioElement]);

  useEffect(() => {
    if (audioElement && currentBeat) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      // Handle both S3 URLs and local URLs
      const audioUrl = currentBeat.audio_url.startsWith('http') 
        ? currentBeat.audio_url 
        : `${backendUrl}${currentBeat.audio_url}`;
      audioElement.src = audioUrl;
      audioElement.load();
    }
  }, [currentBeat, audioElement]);

  useEffect(() => {
    if (!audioElement) return;

    const handleLoadedMetadata = () => {
      setDuration(audioElement.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
    };

    const handleEnded = () => {
      setCurrentTime(0);
      usePlayerStore.setState({ isPlaying: false });
    };

    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement, setDuration, setCurrentTime]);

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value) => {
    seek(value[0]);
  };

  const handleBuyNow = () => {
    if (currentBeat) {
      addItem(currentBeat, 'MP3', currentBeat.price_mp3);
      toast.success('Adicionado ao carrinho!');
      navigate('/cart');
    }
  };

  // Get effective max for slider
  const effectiveMax = isPreviewMode ? Math.min(duration || 100, PREVIEW_DURATION) : (duration || 100);

  if (!currentBeat) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" data-testid="global-player">
      <div className="max-w-5xl mx-auto glass rounded-3xl p-6 shadow-2xl">
        <audio ref={audioRef} />
        
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-yellow-500/90 text-black font-medium px-3 py-1 rounded-full">
              <Lock className="w-3 h-3 mr-1" />
              Preview 30s
            </Badge>
          </div>
        )}
        
        <div className="flex items-center gap-6">
          {/* Beat Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <img
              src={currentBeat.image_url || 'https://images.unsplash.com/photo-1694843689189-2ad1a6c4a364?q=85'}
              alt={currentBeat.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate" style={{ fontFamily: 'Manrope' }} data-testid="player-beat-title">
                {currentBeat.title}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {currentBeat.producer_name}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10"
                disabled
              >
                <SkipBack className="w-5 h-5" strokeWidth={1.5} />
              </Button>
              
              <Button
                onClick={togglePlay}
                size="icon"
                className="rounded-full w-12 h-12 bg-primary hover:bg-primary/90 neon-purple"
                data-testid="player-play-pause-button"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" strokeWidth={1.5} fill="white" />
                ) : (
                  <Play className="w-6 h-6 ml-1" strokeWidth={1.5} fill="white" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10"
                disabled
              >
                <SkipForward className="w-5 h-5" strokeWidth={1.5} />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 w-full max-w-md">
              <span className="text-xs text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative">
                <Slider
                  value={[Math.min(currentTime, effectiveMax)]}
                  max={effectiveMax}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="flex-1"
                  data-testid="player-progress-slider"
                />
                {/* Preview limit indicator */}
                {isPreviewMode && duration > PREVIEW_DURATION && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-yellow-500"
                    style={{ left: `${(PREVIEW_DURATION / duration) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-xs text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
                {isPreviewMode ? formatTime(PREVIEW_DURATION) : formatTime(duration)}
              </span>
            </div>
            
            {/* Preview Ended Message */}
            {previewEnded && (
              <p className="text-xs text-yellow-500 animate-pulse">
                Preview finalizado - Compre para ouvir completo!
              </p>
            )}
          </div>

          {/* Volume + Buy Button */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <Slider
                defaultValue={[100]}
                max={100}
                step={1}
                className="w-24"
                onValueChange={(value) => {
                  if (audioElement) {
                    audioElement.volume = value[0] / 100;
                  }
                }}
              />
            </div>
            
            {/* Buy Now Button (only in preview mode) */}
            {isPreviewMode && (
              <Button
                onClick={handleBuyNow}
                size="sm"
                className="rounded-full bg-green-600 hover:bg-green-700 text-white px-4"
                data-testid="player-buy-button"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                R$ {currentBeat.price_mp3?.toFixed(2)}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlayer;
