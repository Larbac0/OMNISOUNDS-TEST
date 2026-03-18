import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, CreditCard, Lock, X, Music, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';

// Modal inline de login/cadastro para usuários não autenticados
const AuthModal = ({ onClose, onLogin, onRegister }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    />

    {/* Card */}
    <div className="relative glass rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/10 z-10">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
      >
        <X className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {/* Ícone */}
      <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
        <Lock className="w-7 h-7 text-primary" strokeWidth={1.5} />
      </div>

      <h2
        className="text-2xl font-bold text-center mb-2"
        style={{ fontFamily: 'Manrope' }}
      >
        Finalize sua compra
      </h2>
      <p className="text-muted-foreground text-center text-sm mb-8">
        Para prosseguir com o pagamento, você precisa estar logado na sua conta.
      </p>

      <div className="space-y-3">
        <Button
          onClick={onLogin}
          className="w-full rounded-full bg-primary hover:bg-primary/90 h-12 gap-2"
          data-testid="modal-login-button"
        >
          <Mail className="w-4 h-4" strokeWidth={1.5} />
          Entrar na minha conta
        </Button>
        <Button
          onClick={onRegister}
          variant="outline"
          className="w-full rounded-full h-12 border-white/10 hover:bg-white/5 gap-2"
          data-testid="modal-register-button"
        >
          <Music className="w-4 h-4" strokeWidth={1.5} />
          Criar conta grátis
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Seus itens serão mantidos no carrinho 🎵
      </p>
    </div>
  </div>
);

const Cart = () => {
  const navigate = useNavigate();
  const { items, removeItem, getTotal } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    navigate('/checkout');
  };

  const handleModalLogin = () => {
    setShowAuthModal(false);
    navigate('/login', { state: { from: '/checkout' } });
  };

  const handleModalRegister = () => {
    setShowAuthModal(false);
    navigate('/register', { state: { from: '/checkout' } });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-32">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="glass rounded-3xl p-12 md:p-20 text-center" data-testid="empty-cart">
            <ShoppingCart className="w-24 h-24 text-muted-foreground mx-auto mb-6" strokeWidth={1.5} />
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
              Seu carrinho está vazio
            </h2>
            <p className="text-muted-foreground mb-8">
              Explore nossa coleção de beats e adicione seus favoritos ao carrinho
            </p>
            <Button
              onClick={() => navigate('/explore')}
              className="rounded-full bg-primary hover:bg-primary/90 px-8"
            >
              Explorar Beats
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal de autenticação */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLogin={handleModalLogin}
          onRegister={handleModalRegister}
        />
      )}

      <div className="min-h-screen pt-24 pb-32">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="mb-12">
            <h1
              className="text-4xl md:text-6xl font-bold tracking-tight mb-2"
              style={{ fontFamily: 'Manrope' }}
              data-testid="cart-title"
            >
              Carrinho de Compras
            </h1>
            <p className="text-lg text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'itens'} no carrinho
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Itens */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, index) => (
                <div
                  key={`${item.beat.id}-${item.licenseType}`}
                  className="glass rounded-2xl p-6"
                  data-testid={`cart-item-${index}`}
                >
                  <div className="flex gap-4">
                    <img
                      src={item.beat.image_url || 'https://images.unsplash.com/photo-1694843689189-2ad1a6c4a364?q=85'}
                      alt={item.beat.title}
                      className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate" style={{ fontFamily: 'Manrope' }}>
                        {item.beat.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">{item.beat.producer_name}</p>
                      <div
                        className="flex items-center gap-3 text-xs text-muted-foreground"
                        style={{ fontFamily: 'JetBrains Mono' }}
                      >
                        <span>{item.beat.bpm} BPM</span>
                        <span>{item.beat.key}</span>
                        <span className="px-2 py-1 rounded-md bg-white/5">{item.beat.genre}</span>
                      </div>
                      <div className="mt-3">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          Licença {item.licenseType}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between flex-shrink-0">
                      <span className="text-2xl font-bold text-primary">
                        R$ {item.price.toFixed(2)}
                      </span>
                      <Button
                        onClick={() => removeItem(item.beat.id, item.licenseType)}
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                        data-testid={`remove-item-${index}`}
                      >
                        <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo */}
            <div className="lg:col-span-1">
              <div className="glass rounded-2xl p-6 sticky top-24" data-testid="order-summary">
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                  Resumo do Pedido
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>R$ {getTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxas</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total</span>
                      <span className="text-primary">R$ {getTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full rounded-full bg-primary hover:bg-primary/90 h-14 text-lg gap-2"
                  data-testid="checkout-button"
                >
                  <CreditCard className="w-5 h-5" strokeWidth={1.5} />
                  Finalizar Compra
                </Button>

                {!isAuthenticated && (
                  <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" strokeWidth={1.5} />
                    Login necessário para pagar
                  </p>
                )}

                <p className="text-xs text-muted-foreground text-center mt-2">
                  Pagamento seguro processado pelo Asaas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Cart;
