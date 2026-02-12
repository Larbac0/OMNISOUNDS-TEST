import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, DollarSign, Music, TrendingUp, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { producersAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import BeatCard from '@/components/BeatCard';

const ProducerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'PRODUCER' && user?.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [statsRes, beatsRes] = await Promise.all([
        producersAPI.getStats(),
        producersAPI.getBeats()
      ]);
      setStats(statsRes.data);
      setBeats(beatsRes.data);
    } catch (error) {
      console.error('Error fetching producer data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-32">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-card/50 rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-card/50 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Manrope' }} data-testid="producer-dashboard-title">
              Dashboard do Produtor
            </h1>
            <p className="text-lg text-muted-foreground">
              Bem-vindo, {user?.name}
            </p>
          </div>
          <Button
            onClick={() => navigate('/producer/upload')}
            className="rounded-full bg-primary hover:bg-primary/90 gap-2"
            data-testid="upload-new-beat-button"
          >
            <Upload className="w-5 h-5" strokeWidth={1.5} />
            Novo Beat
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="rounded-2xl border border-white/5 bg-card/50 backdrop-blur-xl p-6" data-testid="stat-total-beats">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {stats?.total_beats || 0}
            </h3>
            <p className="text-sm text-muted-foreground">Total de Beats</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-card/50 backdrop-blur-xl p-6" data-testid="stat-total-sales">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {stats?.total_sales || 0}
            </h3>
            <p className="text-sm text-muted-foreground">Vendas</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-card/50 backdrop-blur-xl p-6" data-testid="stat-total-revenue">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              R$ {(stats?.total_revenue || 0).toFixed(2)}
            </h3>
            <p className="text-sm text-muted-foreground">Receita Total</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-card/50 backdrop-blur-xl p-6" data-testid="stat-total-plays">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-accent" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {stats?.total_plays || 0}
            </h3>
            <p className="text-sm text-muted-foreground">Reproduções</p>
          </div>
        </div>

        {/* Recent Sales */}
        {stats?.recent_sales && stats.recent_sales.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
              Vendas Recentes
            </h2>
            <div className="glass rounded-2xl p-6">
              <div className="space-y-4">
                {stats.recent_sales.map((sale, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-medium">{sale.beat_title}</p>
                      <p className="text-sm text-muted-foreground">
                        Licença: {sale.license_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">R$ {sale.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* My Beats */}
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
            Meus Beats
          </h2>
          {beats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="producer-beats-grid">
              {beats.map((beat) => (
                <BeatCard key={beat.id} beat={beat} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-xl text-muted-foreground mb-4">
                Você ainda não tem beats cadastrados
              </p>
              <Button
                onClick={() => navigate('/producer/upload')}
                className="rounded-full bg-primary hover:bg-primary/90"
              >
                Fazer Upload do Primeiro Beat
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProducerDashboard;
