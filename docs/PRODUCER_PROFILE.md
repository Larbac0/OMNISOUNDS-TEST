# 🎤 Perfil Público do Produtor

> Criar uma página de perfil público rica e envolvente para produtores

---

## 🎯 Objetivo

Página de perfil que:
- Mostra identidade visual do produtor
- Lista todos os beats disponíveis
- Exibe estatísticas e conquistas
- Permite seguir o produtor (futuro)
- Inclui biografiamais e links sociais

---

## 🎨 Design Reference

**Inspiração:**
- Spotify: Layout de artista
- BeatStars: Perfil de produtor
- SoundCloud: Banner + avatar

---

## 📝 1. Página ProducerProfile

**`/app/frontend/src/pages/ProducerProfile.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Music, TrendingUp, Play, MapPin, Link as LinkIcon, Instagram, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BeatCard from '@/components/BeatCard';
import { producersAPI } from '@/services/api';
import { toast } from 'sonner';

const ProducerProfile = () => {
  const { id } = useParams();
  const [producerData, setProducerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beats');

  useEffect(() => {
    fetchProducerProfile();
  }, [id]);

  const fetchProducerProfile = async () => {
    try {
      const response = await producersAPI.getProfile(id);
      setProducerData(response.data);
    } catch (error) {
      console.error('Error fetching producer:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!producerData) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <p className="text-muted-foreground">Produtor não encontrado</p>
      </div>
    );
  }

  const { producer, beats, stats } = producerData;

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[400px] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1742163512400-7af30b2d17cc?q=85&w=1920"
            alt="Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-[#050505]" />
        </div>

        {/* Content */}
        <div className="relative h-full max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col justify-end pb-12">
          <div className="flex items-end gap-8">
            {/* Avatar */}
            <div className="w-48 h-48 rounded-2xl border-4 border-white/20 overflow-hidden bg-card flex-shrink-0 shadow-2xl">
              {producer.avatar ? (
                <img
                  src={producer.avatar}
                  alt={producer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/20">
                  <Music className="w-20 h-20 text-primary" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pb-4">
              <Badge className="mb-3">Produtor</Badge>
              <h1
                className="text-5xl md:text-7xl font-bold text-white mb-4"
                style={{ fontFamily: 'Manrope' }}
                data-testid="producer-name"
              >
                {producer.name}
              </h1>
              <div className="flex items-center gap-6 text-white/80">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5" strokeWidth={1.5} />
                  <span>{stats.total_beats} beats</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" strokeWidth={1.5} />
                  <span>{stats.total_sales} vendas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5" strokeWidth={1.5} />
                  <span>{stats.total_plays} reproduções</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-4">
              <Button
                size="lg"
                className="rounded-full px-8"
                onClick={() => toast.info('Funcionalidade em desenvolvimento')}
              >
                Seguir
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copiado!');
                }}
              >
                Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-6 mb-8 border-b border-white/10">
              <button
                onClick={() => setActiveTab('beats')}
                className={`pb-4 px-2 font-semibold transition-colors ${
                  activeTab === 'beats'
                    ? 'text-white border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-white'
                }`}
                data-testid="tab-beats"
              >
                Beats ({beats.length})
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`pb-4 px-2 font-semibold transition-colors ${
                  activeTab === 'about'
                    ? 'text-white border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-white'
                }`}
                data-testid="tab-about"
              >
                Sobre
              </button>
            </div>

            {/* Beats Grid */}
            {activeTab === 'beats' && (
              <div>
                {beats.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="beats-grid">
                    {beats.map((beat) => (
                      <BeatCard key={beat.id} beat={beat} />
                    ))}
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-12 text-center">
                    <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-muted-foreground">
                      Este produtor ainda não publicou nenhum beat
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                {producer.bio ? (
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
                      Biografia
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {producer.bio}
                    </p>
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-12 text-center">
                    <p className="text-muted-foreground">
                      Este produtor ainda não adicionou uma biografia
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Stats Card */}
            <div className="glass rounded-2xl p-6 mb-6">
              <h3 className="font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                Estatísticas
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total de Beats</span>
                  <span className="font-bold text-primary">{stats.total_beats}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vendas</span>
                  <span className="font-bold text-primary">{stats.total_sales}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reproduções</span>
                  <span className="font-bold text-primary">{stats.total_plays}</span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Membro desde</span>
                    <span className="font-medium">
                      {new Date(producer.created_at).toLocaleDateString('pt-BR', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links (futuro) */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
                Redes Sociais
              </h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => toast.info('Link em breve')}
                >
                  <Instagram className="w-5 h-5" strokeWidth={1.5} />
                  Instagram
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => toast.info('Link em breve')}
                >
                  <Twitter className="w-5 h-5" strokeWidth={1.5} />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => toast.info('Link em breve')}
                >
                  <LinkIcon className="w-5 h-5" strokeWidth={1.5} />
                  Website
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProducerProfile;
```

---

## 🔀 2. Adicionar Rota

**`/app/frontend/src/App.js`**

```jsx
import ProducerProfile from '@/pages/ProducerProfile';

// Adicionar rota:
<Route path="/producers/:id" element={<ProducerProfile />} />
```

---

## 📊 3. Melhorias Futuras

### 3.1 Sistema de Seguir

```javascript
// Modelo no backend
class Follow {
  follower_id: string;  // Quem segue
  following_id: string; // Quem é seguido
  created_at: datetime;
}

// Endpoints
POST /api/producers/{id}/follow
DELETE /api/producers/{id}/unfollow
GET /api/producers/{id}/followers
GET /api/users/following
```

### 3.2 Links Sociais

Adicionar ao modelo User:

```python
class User:
    # ... campos existentes
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
```

### 3.3 Banner Customizável

Permitir produtor fazer upload do banner:

```python
@api_router.post("/users/banner")
async def upload_banner(
    banner: UploadFile = File(...),
    current_user: dict = Depends(get_current_producer)
):
    # Salvar banner
    # Atualizar user.banner_url
    pass
```

---

## ✅ Checklist

- [ ] Página ProducerProfile criada
- [ ] Rota adicionada
- [ ] Banner hero implementado
- [ ] Grid de beats funcionando
- [ ] Estatísticas exibidas
- [ ] Tabs (Beats/Sobre) funcionando
- [ ] Botão compartilhar implementado
- [ ] Design responsivo testado

---

**Próximo guia**: [Dashboard do Usuário](./USER_DASHBOARD.md)
