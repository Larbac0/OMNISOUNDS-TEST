import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, QrCode, FileText, Loader2, CheckCircle, Copy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';
import { ordersAPI } from '@/services/api';
import { toast } from 'sonner';

// CPF mask function
const formatCPF = (value) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  
  // Credit card form state
  const [cardData, setCardData] = useState({
    number: '',
    holder: '',
    expMonth: '',
    expYear: '',
    cvv: ''
  });

  const total = getTotal();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  if (items.length === 0 && !orderCreated) {
    navigate('/cart');
    return null;
  }

  const handleCpfChange = (e) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate CPF
    const cpfNumbers = cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast.error('CPF inválido. Digite os 11 dígitos.');
      return;
    }
    
    setLoading(true);

    try {
      const orderData = {
        items: items.map(item => ({
          beat_id: item.beat.id,
          license_type: item.licenseType,
          price: item.price
        })),
        billing_type: paymentMethod,
        cpf: cpf.replace(/\D/g, ''),
        phone: phone.replace(/\D/g, '')
      };

      const response = await ordersAPI.create(orderData);
      
      setOrderCreated(response.data);
      
      if (response.data.pix) {
        setPixData(response.data.pix);
      }
      
      clearCart();
      toast.success('Pedido criado com sucesso!');
      
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.copy_paste) {
      navigator.clipboard.writeText(pixData.copy_paste);
      toast.success('Código PIX copiado!');
    }
  };

  // Order Success Screen
  if (orderCreated) {
    return (
      <div className="min-h-screen pt-24 pb-32" data-testid="checkout-success">
        <div className="max-w-xl mx-auto px-4 md:px-8">
          <div className="glass rounded-3xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={1.5} />
            </div>
            
            <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
              Pedido Criado!
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Seu pedido #{orderCreated.id.slice(0, 8)} foi criado com sucesso.
            </p>

            {/* PIX Payment Info */}
            {paymentMethod === 'PIX' && pixData && (
              <div className="space-y-6 mb-8">
                <div className="bg-white rounded-xl p-4">
                  {pixData.qr_code && (
                    <img 
                      src={`data:image/png;base64,${pixData.qr_code}`}
                      alt="QR Code PIX"
                      className="mx-auto max-w-[200px]"
                      data-testid="pix-qr-code"
                    />
                  )}
                </div>
                
                {pixData.copy_paste && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Código PIX Copia e Cola</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={pixData.copy_paste}
                        readOnly
                        className="bg-black/20 border-white/10 text-xs"
                      />
                      <Button
                        onClick={copyPixCode}
                        variant="outline"
                        className="shrink-0"
                        data-testid="copy-pix-button"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code ou copie o código para pagar via PIX.
                  Após a confirmação, você receberá acesso aos downloads.
                </p>
              </div>
            )}

            {/* Boleto Payment Info */}
            {paymentMethod === 'BOLETO' && orderCreated.payment?.bank_slip_url && (
              <div className="space-y-4 mb-8">
                <Button
                  onClick={() => window.open(orderCreated.payment.bank_slip_url, '_blank')}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90"
                  data-testid="boleto-button"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Visualizar Boleto
                </Button>
                <p className="text-sm text-muted-foreground">
                  O boleto vence em 3 dias úteis. Após a confirmação do pagamento,
                  você receberá acesso aos downloads.
                </p>
              </div>
            )}

            {/* Credit Card Success */}
            {paymentMethod === 'CREDIT_CARD' && (
              <div className="mb-8">
                <p className="text-muted-foreground">
                  Pagamento processado! Seus beats estão disponíveis para download.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={() => navigate('/orders')}
                variant="outline"
                className="flex-1 rounded-xl bg-white/5 border-white/10"
              >
                Meus Pedidos
              </Button>
              <Button
                onClick={() => navigate('/explore')}
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
              >
                Explorar Mais
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32" data-testid="checkout-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h1 
          className="text-3xl md:text-4xl font-bold tracking-tight mb-8"
          style={{ fontFamily: 'Manrope' }}
        >
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Method Selection */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>
                  Método de Pagamento
                </h2>

                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    <label 
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'PIX' 
                          ? 'border-primary bg-primary/10' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <RadioGroupItem value="PIX" id="pix" data-testid="payment-pix" />
                      <QrCode className="w-6 h-6 text-primary" strokeWidth={1.5} />
                      <div className="flex-1">
                        <p className="font-medium">PIX</p>
                        <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                      </div>
                    </label>

                    <label 
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'CREDIT_CARD' 
                          ? 'border-primary bg-primary/10' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <RadioGroupItem value="CREDIT_CARD" id="credit" data-testid="payment-credit" />
                      <CreditCard className="w-6 h-6 text-primary" strokeWidth={1.5} />
                      <div className="flex-1">
                        <p className="font-medium">Cartão de Crédito</p>
                        <p className="text-sm text-muted-foreground">Até 12x sem juros</p>
                      </div>
                    </label>

                    <label 
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === 'BOLETO' 
                          ? 'border-primary bg-primary/10' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <RadioGroupItem value="BOLETO" id="boleto" data-testid="payment-boleto" />
                      <FileText className="w-6 h-6 text-primary" strokeWidth={1.5} />
                      <div className="flex-1">
                        <p className="font-medium">Boleto Bancário</p>
                        <p className="text-sm text-muted-foreground">Vencimento em 3 dias</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Personal Info (CPF) */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>
                  Dados Pessoais
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={handleCpfChange}
                      maxLength={14}
                      className="bg-black/20 border-white/10 mt-1"
                      data-testid="checkout-cpf"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Obrigatório para processamento do pagamento</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-black/20 border-white/10 mt-1"
                      data-testid="checkout-phone"
                    />
                  </div>
                </div>
              </div>

              {/* Credit Card Form */}
              {paymentMethod === 'CREDIT_CARD' && (
                <div className="glass rounded-2xl p-6 space-y-4">
                  <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>
                    Dados do Cartão
                  </h2>

                  <div>
                    <Label htmlFor="cardNumber">Número do Cartão</Label>
                    <Input
                      id="cardNumber"
                      placeholder="0000 0000 0000 0000"
                      value={cardData.number}
                      onChange={(e) => setCardData({...cardData, number: e.target.value})}
                      className="bg-black/20 border-white/10 mt-1"
                      data-testid="card-number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cardHolder">Nome no Cartão</Label>
                    <Input
                      id="cardHolder"
                      placeholder="NOME COMO NO CARTÃO"
                      value={cardData.holder}
                      onChange={(e) => setCardData({...cardData, holder: e.target.value})}
                      className="bg-black/20 border-white/10 mt-1"
                      data-testid="card-holder"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expMonth">Mês</Label>
                      <Input
                        id="expMonth"
                        placeholder="MM"
                        maxLength={2}
                        value={cardData.expMonth}
                        onChange={(e) => setCardData({...cardData, expMonth: e.target.value})}
                        className="bg-black/20 border-white/10 mt-1"
                        data-testid="card-exp-month"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expYear">Ano</Label>
                      <Input
                        id="expYear"
                        placeholder="AA"
                        maxLength={2}
                        value={cardData.expYear}
                        onChange={(e) => setCardData({...cardData, expYear: e.target.value})}
                        className="bg-black/20 border-white/10 mt-1"
                        data-testid="card-exp-year"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="000"
                        maxLength={4}
                        value={cardData.cvv}
                        onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                        className="bg-black/20 border-white/10 mt-1"
                        data-testid="card-cvv"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary hover:bg-primary/90 py-6 text-lg neon-purple"
                data-testid="submit-payment"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  `Pagar R$ ${total.toFixed(2)}`
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>
                Resumo do Pedido
              </h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={`${item.beat.id}-${item.licenseType}`} className="flex gap-4">
                    <img
                      src={item.beat.image_url || 'https://images.unsplash.com/photo-1694843689189-2ad1a6c4a364?q=85'}
                      alt={item.beat.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.beat.title}</p>
                      <p className="text-sm text-muted-foreground">{item.licenseType}</p>
                      <p className="text-primary font-medium">R$ {item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary" data-testid="checkout-total">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
