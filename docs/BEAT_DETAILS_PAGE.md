# 🎵 Página de Detalhes do Beat com Waveform

> Guia para implementar uma página rica de detalhes do beat com visualização de waveform

---

## 🎯 Objetivo

Criar uma página imersiva que:
- Mostra todas as informações do beat
- Visualização de waveform interativa
- Player integrado e responsivo
- Opções de licença
- Beats relacionados
- Perfil do produtor

---

## 📚 Referências de Design

**Inspiração:**
- BeatStars: Layout limpo, waveform destaque
- Spotify: Informações organizadas
- SoundCloud: Waveform interativa

---

## 🔧 1. Instalar Dependências

### 1.1 WaveSurfer.js

Já instalado no projeto:

```bash
cd /app/frontend
yarn add wavesurfer.js @wavesurfer/react
```

---

## 🎨 2. Criar Componente Waveform

### 2.1 Componente WaveformPlayer

**`/app/frontend/src/components/WaveformPlayer.jsx`**

```jsx
import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const WaveformPlayer = ({ audioUrl, beatId }) => {
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Criar instância WaveSurfer
    if (waveformRef.current && !wavesurfer.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#A1A1AA',
        progressColor: '#7C3AED',
        cursorColor: '#06B6D4',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 120,
        barGap: 2,
        responsive: true,
        normalize: true,
        backend: 'WebAudio',
      });

      // Carregar áudio
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      wavesurfer.current.load(`${backendUrl}${audioUrl}`);

      // Event listeners
      wavesurfer.current.on('ready', () => {
        setDuration(wavesurfer.current.getDuration());
        setIsReady(true);
      });

      wavesurfer.current.on('audioprocess', () => {
        setCurrentTime(wavesurfer.current.getCurrentTime());
      });

      wavesurfer.current.on('finish', () => {
        setIsPlaying(false);
      });
    }

    // Cleanup
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
        wavesurfer.current = null;
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (value) => {
    if (wavesurfer.current) {
      wavesurfer.current.setVolume(value[0] / 100);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full" data-testid={`waveform-player-${beatId}`}>
      {/* Waveform */}
      <div 
        ref={waveformRef} 
        className="w-full mb-6 rounded-xl overflow-hidden bg-black/20"
        style={{ minHeight: '120px' }}
      />

      {/* Controls */}
      <div className="flex items-center gap-6">
        {/* Play/Pause */}
        <Button
          onClick={handlePlayPause}
          disabled={!isReady}
          size="icon"
          className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 neon-purple"
          data-testid="waveform-play-button"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7" strokeWidth={1.5} fill="white" />
          ) : (
            <Play className="w-7 h-7 ml-1" strokeWidth={1.5} fill="white" />
          )}
        </Button>

        {/* Time */}
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm" style={{ fontFamily: 'JetBrains Mono' }}>
            <span className="text-muted-foreground">{formatTime(currentTime)}</span>
            <span className="text-muted-foreground">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          <Slider
            defaultValue={[100]}
            max={100}
            step={1}
            className="w-24"
            onValueChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default WaveformPlayer;
```

---

## 📝 3. Criar Página BeatDetails

**`/app/frontend/src/pages/BeatDetails.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Share2, ShoppingCart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import WaveformPlayer from '@/components/WaveformPlayer';
import BeatCard from '@/components/BeatCard';
import { beatsAPI, favoritesAPI } from '@/services/api';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';

const LICENSE_INFO = {
  MP3: {
    name: 'Licença MP3',
    description: 'Formato MP3 de alta qualidade',
    features: [
      'Uso comercial limitado',
      'Até 10.000 streams',
      'Até 5.000 cópias físicas',
      'Tag do produtor pode ser mantida',
    ],
  },
  WAV: {
    name: 'Licença WAV',
    description: 'Formato WAV sem compressão',
    features: [
      'Uso comercial ampliado',
      'Até 100.000 streams',
      'Até 50.000 cópias físicas',
      'Stems trackouts (sob solicitação)',
      'Tag removida',
    ],
  },
  EXCLUSIVE: {
    name: 'Licença Exclusiva',
    description: 'Direitos exclusivos completos',
    features: [
      'Uso comercial ilimitado',
      'Streams ilimitados',
      'Cópias físicas ilimitadas',
      'Stems trackouts incluídos',
      'Beat removido da venda',
      'Transferência de copyright',
    ],
  },
};

const BeatDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [beat, setBeat] = useState(null);
  const [relatedBeats, setRelatedBeats] = useState([]);
  const [selectedLicense, setSelectedLicense] = useState('MP3');
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBeat();
  }, [id]);

  const fetchBeat = async () => {
    try {
      const response = await beatsAPI.getById(id);
      setBeat(response.data);
      
      // Fetch related beats (mesmo gênero)
      const relatedResponse = await beatsAPI.getAll({
        genre: response.data.genre,
        limit: 4,
      });
      setRelatedBeats(relatedResponse.data.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error fetching beat:', error);
      toast.error('Erro ao carregar beat');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    const prices = {
      MP3: beat.price_mp3,
      WAV: beat.price_wav,
      EXCLUSIVE: beat.price_exclusive,
    };
    
    addItem(beat, selectedLicense, prices[selectedLicense]);
    toast.success('Adicionado ao carrinho!');
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await favoritesAPI.remove(beat.id);
        setIsFavorite(false);
        toast.success('Removido dos favoritos');
      } else {
        await favoritesAPI.add(beat.id);
        setIsFavorite(true);
        toast.success('Adicionado aos favoritos');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!beat) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <p className="text-muted-foreground">Beat não encontrado</p>
      </div>
    );
  }

  const currentPrice = {
    MP3: beat.price_mp3,
    WAV: beat.price_wav,
    EXCLUSIVE: beat.price_exclusive,
  }[selectedLicense];

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left: Cover + Info */}
          <div className="lg:col-span-2">
            {/* Cover Image */}
            <div className="relative aspect-video rounded-3xl overflow-hidden mb-8 group">
              <img
                src={beat.image_url || 'https://images.unsplash.com/photo-1694843689189-2ad1a6c4a364?q=85'}
                alt={beat.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              
              {/* Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-primary text-white">{beat.genre}</Badge>
                  <span className="text-sm text-white/80" style={{ fontFamily: 'JetBrains Mono' }}>
                    {beat.bpm} BPM
                  </span>
                  <span className="text-sm text-white/80" style={{ fontFamily: 'JetBrains Mono' }}>
                    {beat.key}
                  </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope' }}>
                  {beat.title}
                </h1>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:text-primary"
                    onClick={() => navigate(`/producers/${beat.producer_id}`)}
                  >
                    <User className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    {beat.producer_name}
                  </Button>
                  <span className="text-white/60 text-sm">•</span>
                  <span className="text-white/80 text-sm">{beat.plays} reproduções</span>
                </div>
              </div>
            </div>

            {/* Waveform Player */}
            <div className="glass rounded-3xl p-8 mb-8">
              <WaveformPlayer audioUrl={beat.audio_url} beatId={beat.id} />
            </div>

            {/* Description */}
            {beat.description && (
              <div className="glass rounded-3xl p-8 mb-8">
                <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
                  Sobre este Beat
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {beat.description}
                </p>
              </div>
            )}

            {/* License Details */}
            <div className="glass rounded-3xl p-8">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                Detalhes da Licença {LICENSE_INFO[selectedLicense].name}
              </h2>
              <ul className="space-y-3">
                {LICENSE_INFO[selectedLicense].features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: License Selector + Actions */}
          <div className="lg:col-span-1">
            <div className="glass rounded-3xl p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                Escolha a Licença
              </h2>

              {/* License Options */}
              <div className="space-y-3 mb-6">
                {/* MP3 */}
                <div
                  onClick={() => setSelectedLicense('MP3')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedLicense === 'MP3'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  data-testid="license-mp3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">MP3</h3>
                    <span className="text-lg font-bold text-primary">
                      R$ {beat.price_mp3.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {LICENSE_INFO.MP3.description}
                  </p>
                </div>

                {/* WAV */}
                <div
                  onClick={() => setSelectedLicense('WAV')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedLicense === 'WAV'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  data-testid="license-wav"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">WAV</h3>
                    <span className="text-lg font-bold text-primary">
                      R$ {beat.price_wav.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {LICENSE_INFO.WAV.description}
                  </p>
                </div>

                {/* EXCLUSIVE */}
                <div
                  onClick={() => setSelectedLicense('EXCLUSIVE')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedLicense === 'EXCLUSIVE'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  data-testid="license-exclusive"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">Exclusivo</h3>
                    <span className="text-lg font-bold text-primary">
                      R$ {beat.price_exclusive.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {LICENSE_INFO.EXCLUSIVE.description}
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Preço</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {currentPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddToCart}
                  className="w-full rounded-full bg-primary hover:bg-primary/90 h-12 gap-2"
                  data-testid="add-to-cart-button"
                >
                  <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                  Adicionar ao Carrinho
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleToggleFavorite}
                    variant="outline"
                    className="rounded-full gap-2"
                    data-testid="favorite-button"
                  >
                    <Heart
                      className="w-5 h-5"
                      strokeWidth={1.5}
                      fill={isFavorite ? 'currentColor' : 'none'}
                    />
                    {isFavorite ? 'Favoritado' : 'Favoritar'}
                  </Button>

                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copiado!');
                    }}
                    variant="outline"
                    className="rounded-full gap-2"
                  >
                    <Share2 className="w-5 h-5" strokeWidth={1.5} />
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Beats */}
        {relatedBeats.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Manrope' }}>
              Beats Similares
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedBeats.map((relatedBeat) => (
                <BeatCard key={relatedBeat.id} beat={relatedBeat} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeatDetails;
```

---

## 🔀 4. Adicionar Rota

**`/app/frontend/src/App.js`**

```jsx
import BeatDetails from '@/pages/BeatDetails';

// Adicionar na seção de rotas:
<Route path="/beats/:id" element={<BeatDetails />} />
```

---

## 🎨 5. Design Tokens Extras

Adicione em `/app/frontend/src/index.css`:

```css
/* Waveform customizations */
wave {
  overflow: hidden !important;
}

/* Loading shimmer */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.shimmer {
  animation: shimmer 2s infinite;
  background: linear-gradient(
    to right,
    #0a0a0a 4%,
    #1a1a1a 25%,
    #0a0a0a 36%
  );
  background-size: 1000px 100%;
}
```

---

## ✅ Checklist de Implementação

- [ ] WaveSurfer.js instalado
- [ ] Componente WaveformPlayer criado
- [ ] Página BeatDetails completa
- [ ] Rota adicionada ao App.js
- [ ] Seleção de licenças funcionando
- [ ] Botão de favoritar integrado
- [ ] Compartilhamento implementado
- [ ] Beats relacionados carregando
- [ ] Design responsivo testado
- [ ] Waveform carregando corretamente

---

## 📱 Responsividade

A página é totalmente responsiva:

- **Desktop**: Layout 2 colunas (beat + sidebar)
- **Tablet**: Sidebar abaixo do conteúdo
- **Mobile**: Stack vertical completo

---

## 🚀 Melhorias Futuras

1. **Comentários**: Seção de comentários abaixo
2. **Loop Points**: Marcar pontos de loop no waveform
3. **Comparação**: Comparar beats lado a lado
4. **Preview Tags**: Marca d'água de áudio no preview
5. **Analytics**: Track de reproduções por usuário

---

**Próximo guia**: [Perfil Público do Produtor](./PRODUCER_PROFILE.md)
