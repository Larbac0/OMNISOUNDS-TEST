import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, ShoppingCart, Share2, User, Clock, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import usePlayerStore from '@/store/playerStore';
import useCartStore from '@/store/cartStore';
import { beatsAPI } from '@/services/api';
import { toast } from 'sonner';

const BeatDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState('MP3');
  const { currentBeat, isPlaying, setCurrentBeat, togglePlay } = usePlayerStore();
  const { addItem } = useCartStore();
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);

  const isCurrentBeat = currentBeat?.id === beat?.id;

  useEffect(() => {
    fetchBeat();
  }, [id]);

  useEffect(() => {
    // Initialize waveform when beat is loaded
    if (beat && waveformRef.current && !wavesurferRef.current) {
      import('wavesurfer.js').then((WaveSurfer) => {
        wavesurferRef.current = WaveSurfer.default.create({
          container: waveformRef.current,
          waveColor: 'rgba(155, 89, 182, 0.5)',
          progressColor: '#9b59b6',
          cursorColor: '#9b59b6',
          barWidth: 2,
          barRadius: 3,
          cursorWidth: 0,
          height: 80,
          barGap: 2,
          responsive: true,
          normalize: true,
          backend: 'WebAudio'
        });

        const audioUrl = beat.audio_url.startsWith('http') 
          ? beat.audio_url 
          : `${import.meta.env.VITE_BACKEND_URL}${beat.audio_url}`;
        
        wavesurferRef.current.load(audioUrl);
      });
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [beat]);

  const fetchBeat = async () => {
    try {
      const response = await beatsAPI.getById(id);
      setBeat(response.data);
    } catch (error) {
      console.error('Error fetching beat:', error);
      toast.error('Erro ao carregar beat');
      navigate('/explore');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (isCurrentBeat) {
      togglePlay();
    } else {
      setCurrentBeat(beat);
      setTimeout(() => togglePlay(), 100);
    }
  };

  const handleAddToCart = () => {
    const price = selectedLicense === 'MP3' 
      ? beat.price_mp3 
      : selectedLicense === 'WAV' 
        ? beat.price_wav 
        : beat.price_exclusive;
    
    addItem(beat, selectedLicense, price);
    toast.success(`${beat.title} (${selectedLicense}) adicionado ao carrinho!`);
  };

  const getSelectedPrice = () => {
    if (!beat) return 0;
    return selectedLicense === 'MP3' 
      ? beat.price_mp3 
      : selectedLicense === 'WAV' 
        ? beat.price_wav 
        : beat.price_exclusive;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!beat) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-32" data-testid="beat-details-page">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Image and Waveform */}
          <div className="space-y-6">
            {/* Beat Image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/5">
              <img
                src={beat.image_url || 'https://images.unsplash.com/photo-1694843689189-2ad1a6c4a364?q=85'}
                alt={beat.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={handlePlay}
                  size="icon"
                  className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary neon-purple"
                  data-testid="play-beat-button"
                >
                  {isCurrentBeat && isPlaying ? (
                    <Pause className="w-10 h-10" strokeWidth={1.5} fill="white" />
                  ) : (
                    <Play className="w-10 h-10 ml-1" strokeWidth={1.5} fill="white" />
                  )}
                </Button>
              </div>
            </div>

            {/* Waveform */}
            <div className="glass rounded-2xl p-6">
              <div ref={waveformRef} className="w-full" data-testid="waveform" />
            </div>

            {/* Beat Info Tags */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="px-4 py-2 rounded-full bg-white/5 border-white/10">
                <Music className="w-4 h-4 mr-2" strokeWidth={1.5} />
                {beat.bpm} BPM
              </Badge>
              <Badge variant="outline" className="px-4 py-2 rounded-full bg-white/5 border-white/10">
                {beat.key}
              </Badge>
              <Badge variant="outline" className="px-4 py-2 rounded-full bg-primary/20 border-primary/30 text-primary">
                {beat.genre}
              </Badge>
              <Badge variant="outline" className="px-4 py-2 rounded-full bg-white/5 border-white/10">
                <Clock className="w-4 h-4 mr-2" strokeWidth={1.5} />
                {beat.plays || 0} plays
              </Badge>
            </div>
          </div>

          {/* Right Column - Details and Purchase */}
          <div className="space-y-8">
            {/* Title and Producer */}
            <div>
              <h1 
                className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
                style={{ fontFamily: 'Manrope' }}
                data-testid="beat-title"
              >
                {beat.title}
              </h1>
              <button
                onClick={() => navigate(`/producer/${beat.producer_id}`)}
                className="flex items-center gap-3 text-muted-foreground hover:text-white transition-colors"
                data-testid="producer-link"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-lg">{beat.producer_name}</span>
              </button>
            </div>

            {/* Description */}
            {beat.description && (
              <p className="text-muted-foreground leading-relaxed">
                {beat.description}
              </p>
            )}

            {/* License Selection */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Manrope' }}>
                Selecione a Licença
              </h3>
              
              <Tabs value={selectedLicense} onValueChange={setSelectedLicense} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-black/20 rounded-xl p-1">
                  <TabsTrigger 
                    value="MP3" 
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                    data-testid="license-mp3"
                  >
                    MP3
                  </TabsTrigger>
                  <TabsTrigger 
                    value="WAV" 
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                    data-testid="license-wav"
                  >
                    WAV
                  </TabsTrigger>
                  <TabsTrigger 
                    value="EXCLUSIVE" 
                    className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                    data-testid="license-exclusive"
                  >
                    Exclusiva
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="MP3" className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Arquivo MP3 de alta qualidade (320kbps). Ideal para demos e mixtapes.
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Até 5.000 streams</li>
                    <li>Uso em redes sociais</li>
                    <li>Créditos obrigatórios</li>
                  </ul>
                </TabsContent>

                <TabsContent value="WAV" className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Arquivo WAV sem compressão. Qualidade de estúdio para lançamentos.
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Até 50.000 streams</li>
                    <li>Distribuição em plataformas</li>
                    <li>Stems incluídos</li>
                  </ul>
                </TabsContent>

                <TabsContent value="EXCLUSIVE" className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Licença exclusiva. O beat é removido do catálogo após a compra.
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Streams ilimitados</li>
                    <li>100% dos royalties</li>
                    <li>Todos os arquivos fonte</li>
                  </ul>
                </TabsContent>
              </Tabs>

              {/* Price Display */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <span className="text-sm text-muted-foreground">Preço</span>
                  <p className="text-3xl font-bold text-primary" data-testid="beat-price">
                    R$ {getSelectedPrice().toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={handleAddToCart}
                  size="lg"
                  className="rounded-full bg-primary hover:bg-primary/90 px-8 neon-purple"
                  data-testid="add-to-cart-button"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 rounded-xl bg-white/5 border-white/10 hover:bg-white/10"
                onClick={() => toast.info('Funcionalidade de favoritos em desenvolvimento')}
                data-testid="favorite-button"
              >
                <Heart className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Favoritar
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-xl bg-white/5 border-white/10 hover:bg-white/10"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copiado!');
                }}
                data-testid="share-button"
              >
                <Share2 className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeatDetails;
