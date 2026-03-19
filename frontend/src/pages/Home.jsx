import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, TrendingUp, Users, Disc3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BeatCard from '@/components/BeatCard';
import { beatsAPI } from '@/services/api';
import { toast } from 'sonner';

const Home = () => {
  const navigate = useNavigate();
  const [featuredBeats, setFeaturedBeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBeats();
  }, []);

const fetchBeats = async () => {
  try {
    const response = await beatsAPI.getAll({ limit: 6 });
    const data = response.data;
    
    // Suporta os dois formatos: array direto [] ou objeto {beats: []}
    if (Array.isArray(data)) {
      setFeaturedBeats(data);
    } else if (data && Array.isArray(data.beats)) {
      setFeaturedBeats(data.beats);
    } else {
      setFeaturedBeats([]);
    }
  } catch (error) {
    console.error('Error fetching beats:', error);
    setFeaturedBeats([]);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1742163512400-7af30b2d17cc?crop=entropy&cs=srgb&fm=jpg&q=85"
            alt="Studio Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-[#050505]" />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto px-4">
          <h1
            className="text-5xl md:text-7xl font-bold tracking-tight leading-none mb-6"
            style={{ fontFamily: 'Manrope' }}
            data-testid="hero-title"
          >
            O Marketplace Premium
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Para Produtores Brasileiros
            </span>
          </h1>
          
          <p className="text-base md:text-lg leading-relaxed text-muted-foreground mb-12 max-w-2xl mx-auto">
            Compre e venda beats profissionais. Conecte-se com os melhores produtores e artistas do Brasil.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate('/explore')}
              size="lg"
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all duration-300 font-medium px-8 py-6"
              data-testid="explore-beats-button"
            >
              <Play className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Explorar Beats
            </Button>
            <Button
              onClick={() => navigate('/register')}
              size="lg"
              variant="outline"
              className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all px-8 py-6"
              data-testid="start-selling-button"
            >
              Começar a Vender
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-3xl border border-white/5 bg-card/50 backdrop-blur-xl p-8 text-center" data-testid="stat-producers">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>500+</h3>
            <p className="text-muted-foreground">Produtores Ativos</p>
          </div>

          <div className="rounded-3xl border border-white/5 bg-card/50 backdrop-blur-xl p-8 text-center" data-testid="stat-beats">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Disc3 className="w-8 h-8 text-accent" strokeWidth={1.5} />
            </div>
            <h3 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>10k+</h3>
            <p className="text-muted-foreground">Beats Disponíveis</p>
          </div>

          <div className="rounded-3xl border border-white/5 bg-card/50 backdrop-blur-xl p-8 text-center" data-testid="stat-sales">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>50k+</h3>
            <p className="text-muted-foreground">Vendas Realizadas</p>
          </div>
        </div>
      </section>

      {/* Featured Beats */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-20">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'Manrope' }}>
              Beats em Destaque
            </h2>
            <p className="text-muted-foreground">Os beats mais populares da semana</p>
          </div>
          <Button
            onClick={() => navigate('/explore')}
            variant="ghost"
            className="rounded-full"
          >
            Ver Todos
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-card/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="featured-beats-grid">
            {featuredBeats.map((beat) => (
              <BeatCard key={beat.id} beat={beat} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-20">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-primary/20 via-card/50 to-accent/20 backdrop-blur-xl p-12 md:p-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Manrope' }}>
            Pronto para Vender Seus Beats?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de produtores que já estão monetizando sua música no OMINSOUNDS.
          </p>
          <Button
            onClick={() => navigate('/register')}
            size="lg"
            className="rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/25 transition-all duration-300 font-medium px-8 py-6"
            data-testid="cta-register-button"
          >
            Criar Conta de Produtor
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
