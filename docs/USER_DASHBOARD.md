# 📊 Dashboard do Usuário

> Área completa para usuários gerenciarem compras, favoritos e configurações

---

## 🎯 Objetivo

Criar uma área do usuário com:
- **Dashboard**: Visão geral de atividades
- **Compras**: Histórico de pedidos + downloads
- **Favoritos**: Beats salvos
- **Configurações**: Editar perfil

---

## 📝 1. Dashboard Principal

**`/app/frontend/src/pages/user/UserDashboard.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, User, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BeatCard from '@/components/BeatCard';
import { ordersAPI, favoritesAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSpent: 0,
    favoritesCount: 0,
  });
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [favoriteBeats, setFavoriteBeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar pedidos
      const ordersRes = await ordersAPI.getAll();
      const orders = ordersRes.data;
      
      // Calcular estatísticas
      const paidOrders = orders.filter(o => o.status === 'PAID');
      const totalSpent = paidOrders.reduce((sum, o) => sum + o.total, 0);
      
      setStats(prev => ({
        ...prev,
        totalPurchases: paidOrders.length,
        totalSpent: totalSpent,
      }));
      
      setRecentPurchases(orders.slice(0, 3));
      
      // Buscar favoritos
      const favoritesRes = await favoritesAPI.getAll();
      const favorites = favoritesRes.data;
      
      setStats(prev => ({ ...prev, favoritesCount: favorites.length }));
      setFavoriteBeats(favorites.slice(0, 4));
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erro ao carregar dashboard');
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

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>
            Bem-vindo, {user?.name}!
          </h1>
          <p className="text-lg text-muted-foreground">
            Gerencie suas compras, favoritos e configurações
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {stats.totalPurchases}
            </h3>
            <p className="text-sm text-muted-foreground">Compras Realizadas</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Download className="w-6 h-6 text-accent" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              R$ {stats.totalSpent.toFixed(2)}
            </h3>
            <p className="text-sm text-muted-foreground">Total Investido</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
              {stats.favoritesCount}
            </h3>
            <p className="text-sm text-muted-foreground">Beats Favoritos</p>
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>
              Compras Recentes
            </h2>
            <Button
              variant="ghost"
              onClick={() => navigate('/purchases')}
              className="rounded-full"
            >
              Ver Todas
            </Button>
          </div>

          {recentPurchases.length > 0 ? (
            <div className="space-y-4">
              {recentPurchases.map((order) => (
                <div key={order.id} className="glass rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold mb-1">Pedido #{order.id.slice(0, 8)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} • {' '}
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        R$ {order.total.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {order.status === 'PAID' ? 'Pago' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-muted-foreground mb-4">
                Você ainda não fez nenhuma compra
              </p>
              <Button onClick={() => navigate('/explore')}>
                Explorar Beats
              </Button>
            </div>
          )}
        </div>

        {/* Favorite Beats */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>
              Beats Favoritos
            </h2>
            <Button
              variant="ghost"
              onClick={() => navigate('/favorites')}
              className="rounded-full"
            >
              Ver Todos
            </Button>
          </div>

          {favoriteBeats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {favoriteBeats.map((beat) => (
                <BeatCard key={beat.id} beat={beat} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-muted-foreground mb-4">
                Você ainda não tem favoritos
              </p>
              <Button onClick={() => navigate('/explore')}>
                Explorar Beats
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
```

---

## ❤️ 2. Página de Favoritos

**`/app/frontend/src/pages/user/Favorites.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BeatCard from '@/components/BeatCard';
import { favoritesAPI } from '@/services/api';
import { toast } from 'sonner';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const response = await favoritesAPI.getAll();
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Erro ao carregar favoritos');
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

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <h1 className="text-4xl md:text-6xl font-bold mb-12" style={{ fontFamily: 'Manrope' }}>
          Meus Favoritos
        </h1>

        {favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((beat) => (
              <BeatCard key={beat.id} beat={beat} />
            ))}
          </div>
        ) : (
          <div className="glass rounded-3xl p-12 text-center">
            <Heart className="w-24 h-24 text-muted-foreground mx-auto mb-6" strokeWidth={1.5} />
            <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
              Nenhum favorito ainda
            </h2>
            <p className="text-muted-foreground mb-8">
              Começe a adicionar beats aos seus favoritos para acessá-los facilmente depois
            </p>
            <Button onClick={() => window.location.href = '/explore'}>
              Explorar Beats
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
```

---

## ⚙️ 3. Página de Configurações

**`/app/frontend/src/pages/user/Settings.jsx`**

```jsx
import React, { useState } from 'react';
import { User, Mail, Lock, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usersAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';

const Settings = () => {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await usersAPI.updateProfile(formData);
      updateUser(response.data);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h1 className="text-4xl md:text-6xl font-bold mb-12" style={{ fontFamily: 'Manrope' }}>
          Configurações
        </h1>

        <div className="space-y-8">
          {/* Profile Settings */}
          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
              Informações do Perfil
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Avatar</label>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-primary" strokeWidth={1.5} />
                    )}
                  </div>
                  <Button type="button" variant="outline" className="rounded-full">
                    <ImageIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Alterar Avatar
                  </Button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Nome</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-12 bg-black/20 border-white/10 rounded-xl h-14"
                    required
                  />
                </div>
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type="email"
                    value={user?.email}
                    className="pl-12 bg-black/20 border-white/10 rounded-xl h-14"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  O email não pode ser alterado
                </p>
              </div>

              {/* Bio */}
              {user?.role === 'PRODUCER' && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Biografia</label>
                  <Textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Conte um pouco sobre você..."
                    className="bg-black/20 border-white/10 rounded-xl min-h-32"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="rounded-full px-8"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </div>

          {/* Password Change */}
          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
              Alterar Senha
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Senha Atual</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-12 bg-black/20 border-white/10 rounded-xl h-14"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-12 bg-black/20 border-white/10 rounded-xl h-14"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-12 bg-black/20 border-white/10 rounded-xl h-14"
                  />
                </div>
              </div>

              <Button
                type="button"
                className="rounded-full px-8"
                onClick={() => toast.info('Funcionalidade em desenvolvimento')}
              >
                Alterar Senha
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
```

---

## 🔀 4. Adicionar Rotas

**`/app/frontend/src/App.js`**

```jsx
import UserDashboard from '@/pages/user/UserDashboard';
import Purchases from '@/pages/user/Purchases';
import Favorites from '@/pages/user/Favorites';
import Settings from '@/pages/user/Settings';

// Adicionar rotas protegidas:
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <UserDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/purchases"
  element={
    <ProtectedRoute>
      <Purchases />
    </ProtectedRoute>
  }
/>
<Route
  path="/favorites"
  element={
    <ProtectedRoute>
      <Favorites />
    </ProtectedRoute>
  }
/>
<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  }
/>
```

---

## 🎯 5. Navegação na Navbar

Atualizar `/app/frontend/src/components/layout/Navbar.jsx`:

```jsx
// Adicionar dropdown do usuário
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// No lugar do botão User atual:
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="rounded-full">
      <User className="w-5 h-5" strokeWidth={1.5} />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
      Dashboard
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/purchases')}>
      Minhas Compras
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/favorites')}>
      Favoritos
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate('/settings')}>
      Configurações
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## ✅ Checklist Final

- [ ] UserDashboard criado
- [ ] Página Purchases (já criada no guia anterior)
- [ ] Página Favorites criada
- [ ] Página Settings criada
- [ ] Rotas protegidas adicionadas
- [ ] Dropdown na navbar implementado
- [ ] Estatísticas calculadas corretamente
- [ ] Integração com backend testada

---

## 🚀 Próximos Passos

Com todas essas funcionalidades implementadas, o OMINSOUNDS estará completo! 🎉

Próximas evoluções:
1. Notificações em tempo real
2. Sistema de mensagens
3. Playlists personalizadas
4. Programa de afiliados
5. API pública

---

**Documentação completa!** 📚
