import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BeatCard from '@/components/BeatCard';
import { beatsAPI } from '@/services/api';
import { toast } from 'sonner';

const GENRES = ['Trap', 'Hip Hop', 'R&B', 'Pop', 'Drill', 'Funk', 'Jazz', 'Afrobeat'];
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const Explore = () => {
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    genre: '',
    key: '',
    minBpm: '',
    maxBpm: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchBeats();
  }, []);

  const fetchBeats = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.genre) params.genre = filters.genre;
      if (filters.key) params.key = filters.key;
      if (filters.minBpm) params.min_bpm = parseInt(filters.minBpm);
      if (filters.maxBpm) params.max_bpm = parseInt(filters.maxBpm);

      const response = await beatsAPI.getAll(params);
      setBeats(response.data.beats || response.data || []);
    } catch (error) {
      console.error('Error fetching beats:', error);
      toast.error('Erro ao carregar beats');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBeats();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }} data-testid="explore-title">
            Explorar Beats
          </h1>
          <p className="text-lg text-muted-foreground">
            Encontre o beat perfeito para seu próximo hit
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-12">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <Input
                type="text"
                placeholder="Buscar por título ou produtor..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-12 bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-14 text-sm"
                data-testid="search-input"
              />
            </div>
            <Button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="rounded-xl px-6 bg-white/5 border-white/10 hover:bg-white/10"
              data-testid="filters-toggle"
            >
              <SlidersHorizontal className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <Button
              type="submit"
              className="rounded-xl px-8 bg-primary hover:bg-primary/90"
              data-testid="search-button"
            >
              Buscar
            </Button>
          </form>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="glass rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="filters-panel">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Gênero</label>
                <Select value={filters.genre} onValueChange={(value) => handleFilterChange('genre', value)}>
                  <SelectTrigger className="bg-black/20 border-white/10" data-testid="genre-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {GENRES.map((genre) => (
                      <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Tonalidade</label>
                <Select value={filters.key} onValueChange={(value) => handleFilterChange('key', value)}>
                  <SelectTrigger className="bg-black/20 border-white/10" data-testid="key-filter">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {KEYS.map((key) => (
                      <SelectItem key={key} value={key}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">BPM Mínimo</label>
                <Input
                  type="number"
                  placeholder="Ex: 80"
                  value={filters.minBpm}
                  onChange={(e) => handleFilterChange('minBpm', e.target.value)}
                  className="bg-black/20 border-white/10 h-10"
                  data-testid="min-bpm-filter"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">BPM Máximo</label>
                <Input
                  type="number"
                  placeholder="Ex: 180"
                  value={filters.maxBpm}
                  onChange={(e) => handleFilterChange('maxBpm', e.target.value)}
                  className="bg-black/20 border-white/10 h-10"
                  data-testid="max-bpm-filter"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-[minmax(100px,auto)]">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`h-80 rounded-2xl bg-card/50 animate-pulse ${
                  i === 0 ? 'col-span-1 md:col-span-2 row-span-2' : 'col-span-1'
                }`}
              />
            ))}
          </div>
        ) : beats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-[minmax(100px,auto)]" data-testid="beats-grid">
            {beats.map((beat, index) => (
              <BeatCard key={beat.id} beat={beat} featured={index === 0} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20" data-testid="no-results">
            <p className="text-2xl text-muted-foreground mb-4">Nenhum beat encontrado</p>
            <p className="text-muted-foreground">Tente ajustar seus filtros de busca</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
