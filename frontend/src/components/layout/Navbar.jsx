import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Music, ShoppingCart, User, LogOut, Upload,
  BarChart3, ChevronDown, Settings, Package,
  Heart, LayoutDashboard
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import useCartStore from '@/store/cartStore';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-white/5">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center neon-purple">
              <Music className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>
              OMINSOUNDS
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/explore"
              className="text-muted-foreground hover:text-white transition-colors"
              data-testid="explore-link"
            >
              Explorar
            </Link>
            {isAuthenticated && user?.role === 'PRODUCER' && (
              <Link
                to="/producer"
                className="text-muted-foreground hover:text-white transition-colors flex items-center gap-2"
                data-testid="producer-dashboard-link"
              >
                <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
                Dashboard
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">

            {/* ✅ Carrinho sempre visível (logado ou não) */}
            <Link to="/cart" className="relative" data-testid="cart-link">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-black rounded-full text-xs flex items-center justify-center font-bold">
                    {items.length}
                  </span>
                )}
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Botão de upload para produtor */}
                {user?.role === 'PRODUCER' && (
                  <Button
                    onClick={() => navigate('/producer/upload')}
                    className="hidden md:flex rounded-full bg-primary hover:bg-primary/90 gap-2"
                    data-testid="upload-beat-button"
                  >
                    <Upload className="w-4 h-4" strokeWidth={1.5} />
                    Upload
                  </Button>
                )}

                {/* Dropdown do usuário */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/5 transition-colors"
                    data-testid="user-menu-button"
                  >
                    {/* Avatar ou ícone */}
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/50"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      </div>
                    )}
                    <span className="hidden md:block text-sm font-medium max-w-[100px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      strokeWidth={1.5}
                    />
                  </button>

                  {/* Menu dropdown */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 glass rounded-2xl border border-white/10 shadow-2xl py-2 z-50">
                      {/* Header do usuário */}
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="font-semibold text-sm truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary font-medium">
                          {user?.role === 'PRODUCER' ? 'Produtor' : 'Usuário'}
                        </span>
                      </div>

                      {/* Links */}
                      <div className="py-1">
                        {user?.role === 'PRODUCER' ? (
                          <button
                            onClick={() => handleNavigation('/producer')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                            data-testid="dropdown-dashboard"
                          >
                            <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                            Dashboard
                          </button>
                        ) : (
                          <button
                            onClick={() => handleNavigation('/dashboard')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                            data-testid="dropdown-dashboard"
                          >
                            <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />
                            Meu Dashboard
                          </button>
                        )}

                        <button
                          onClick={() => handleNavigation('/profile')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                          data-testid="dropdown-profile"
                        >
                          <User className="w-4 h-4" strokeWidth={1.5} />
                          Meu Perfil
                        </button>

                        <button
                          onClick={() => handleNavigation('/orders')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                          data-testid="dropdown-orders"
                        >
                          <Package className="w-4 h-4" strokeWidth={1.5} />
                          Minhas Compras
                        </button>

                        <button
                          onClick={() => handleNavigation('/favorites')}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                          data-testid="dropdown-favorites"
                        >
                          <Heart className="w-4 h-4" strokeWidth={1.5} />
                          Favoritos
                        </button>

                        {user?.role === 'PRODUCER' && (
                          <button
                            onClick={() => handleNavigation('/producer/upload')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors md:hidden"
                          >
                            <Upload className="w-4 h-4" strokeWidth={1.5} />
                            Upload Beat
                          </button>
                        )}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-white/10 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                          data-testid="logout-button"
                        >
                          <LogOut className="w-4 h-4" strokeWidth={1.5} />
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  variant="ghost"
                  className="rounded-full"
                  data-testid="login-button"
                >
                  Login
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  className="rounded-full bg-primary hover:bg-primary/90"
                  data-testid="register-button"
                >
                  Registrar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
