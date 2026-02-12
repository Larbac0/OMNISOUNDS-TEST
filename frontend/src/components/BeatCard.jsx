import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import usePlayerStore from '@/store/playerStore';
import useCartStore from '@/store/cartStore';
import { toast } from 'sonner';

const BeatCard = ({ beat, featured = false }) => {
  const navigate = useNavigate();
  const { currentBeat, isPlaying, setCurrentBeat, togglePlay } = usePlayerStore();
  const { addItem } = useCartStore();

  const isCurrentBeat = currentBeat?.id === beat.id;

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isCurrentBeat) {
      togglePlay();
    } else {
      setCurrentBeat(beat);
      setTimeout(() => togglePlay(), 100);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addItem(beat, 'MP3', beat.price_mp3);
    toast.success('Adicionado ao carrinho!');
  };

  return (
    <div
      onClick={() => navigate(`/beats/${beat.id}`)}
      className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-card/50 hover:bg-card/80 transition-all duration-300 hover:border-primary/50 hover:shadow-xl cursor-pointer ${
        featured ? 'col-span-1 md:col-span-2 row-span-2' : 'col-span-1'
      }`}
      data-testid={`beat-card-${beat.id}`}
    >
      {/* Image */}
      <div className={`relative ${
        featured ? 'h-64 md:h-full' : 'h-48'
      } overflow-hidden`}>
        <img
          src={beat.image_url || 'https://images.unsplash.com/photo-1694843689189-2ad1a6c4a364?q=85'}
          alt={beat.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            onClick={handlePlay}
            size="icon"
            className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 neon-purple"
            data-testid={`play-button-${beat.id}`}
          >
            {isCurrentBeat && isPlaying ? (
              <Pause className="w-8 h-8" strokeWidth={1.5} fill="white" />
            ) : (
              <Play className="w-8 h-8 ml-1" strokeWidth={1.5} fill="white" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 line-clamp-1" style={{ fontFamily: 'Manrope' }}>
              {beat.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {beat.producer_name}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.info('Funcionalidade de favoritos em desenvolvimento');
            }}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
            data-testid={`favorite-button-${beat.id}`}
          >
            <Heart className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>

        {/* Beat Info */}
        <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
          <span>{beat.bpm} BPM</span>
          <span>{beat.key}</span>
          <span className="px-2 py-1 rounded-md bg-white/5">{beat.genre}</span>
        </div>

        {/* Price and Action */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-primary">
              R$ {beat.price_mp3.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground ml-1">MP3</span>
          </div>
          <Button
            onClick={handleAddToCart}
            size="sm"
            className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
            data-testid={`add-to-cart-${beat.id}`}
          >
            <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BeatCard;
