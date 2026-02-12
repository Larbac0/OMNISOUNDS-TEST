import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, ShoppingCart, User, LogOut, Upload, BarChart3 } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import useCartStore from '@/store/cartStore';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
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
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
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
                
                <Link to="/cart" className="relative" data-testid="cart-link">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                    {items.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground rounded-full text-xs flex items-center justify-center font-bold">
                        {items.length}
                      </span>
                    )}
                  </Button>
                </Link>

                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  data-testid="profile-button"
                >
                  <User className="w-5 h-5" strokeWidth={1.5} />
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  data-testid="logout-button"
                >
                  <LogOut className="w-5 h-5" strokeWidth={1.5} />
                </Button>
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
