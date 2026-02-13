import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User, Play, Music, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BeatCard from '@/components/BeatCard';
import { producersAPI } from '@/services/api';
import { toast } from 'sonner';

const ProducerProfile = () => {
  const { id } = useParams();
  const [producer, setProducer] = useState(null);
  const [beats, setBeats] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducerData();
  }, [id]);

  const fetchProducerData = async () => {
    try {
      const response = await producersAPI.getProfile(id);
      setProducer(response.data.producer);
      setBeats(response.data.beats);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching producer:', error);
      toast.error('Erro ao carregar perfil do produtor');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!producer) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <p className="text-muted-foreground">Produtor não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32" data-testid="producer-profile-page">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-accent/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 -mt-32 relative z-10">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-background overflow-hidden bg-card shadow-xl">
            {producer.avatar ? (
              <img 
                src={producer.avatar} 
                alt={producer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <User className="w-16 h-16 text-primary" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 
              className="text-4xl md:text-5xl font-bold tracking-tight mb-2"
              style={{ fontFamily: 'Manrope' }}
              data-testid="producer-name"
            >
              {producer.name}
            </h1>
            
            <div className="flex items-center gap-4 text-muted-foreground mb-4">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" strokeWidth={1.5} />
                Membro desde {formatDate(producer.created_at)}
              </span>
            </div>

            {producer.bio && (
              <p className="text-muted-foreground max-w-2xl mb-6">
                {producer.bio}
              </p>
            )}

            <Button
              variant="outline"
              className="rounded-full bg-white/5 border-white/10 hover:bg-white/10"
              onClick={() => toast.info('Funcionalidade de seguir em desenvolvimento')}
              data-testid="follow-button"
            >
              Seguir
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="glass rounded-2xl p-6 text-center" data-testid="stat-beats">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Music className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {stats?.total_beats || 0}
            </p>
            <p className="text-sm text-muted-foreground">Beats</p>
          </div>

          <div className="glass rounded-2xl p-6 text-center" data-testid="stat-plays">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Play className="w-6 h-6 text-accent" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {stats?.total_plays || 0}
            </p>
            <p className="text-sm text-muted-foreground">Plays</p>
          </div>

          <div className="glass rounded-2xl p-6 text-center" data-testid="stat-sales">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {stats?.total_sales || 0}
            </p>
            <p className="text-sm text-muted-foreground">Vendas</p>
          </div>

          <div className="glass rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-accent" strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {producer.role}
            </p>
            <p className="text-sm text-muted-foreground">Tipo</p>
          </div>
        </div>

        {/* Beats Section */}
        <div>
          <h2 
            className="text-2xl md:text-3xl font-semibold tracking-tight mb-8"
            style={{ fontFamily: 'Manrope' }}
          >
            Beats de {producer.name}
          </h2>

          {beats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="producer-beats-grid">
              {beats.map((beat) => (
                <BeatCard key={beat.id} beat={beat} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 glass rounded-2xl">
              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" strokeWidth={1} />
              <p className="text-lg text-muted-foreground">
                Este produtor ainda não publicou nenhum beat
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProducerProfile;
