import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';

const Cart = () => {
  const navigate = useNavigate();
  const { items, removeItem, getTotal } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Navigate to checkout (not implemented yet)
    navigate('/checkout');
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
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Manrope' }} data-testid="cart-title">
            Carrinho de Compras
          </h1>
          <p className="text-lg text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'itens'} no carrinho
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
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
                    className="w-24 h-24 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1" style={{ fontFamily: 'Manrope' }}>
                      {item.beat.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.beat.producer_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
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
                  <div className="flex flex-col items-end justify-between">
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

          {/* Order Summary */}
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

              <p className="text-xs text-muted-foreground text-center mt-4">
                Pagamento seguro processado pelo Asaas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
