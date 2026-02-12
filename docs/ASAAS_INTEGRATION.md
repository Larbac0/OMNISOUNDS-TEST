# 💳 Implementação do Checkout com Asaas

> Guia completo para integrar pagamentos via Asaas no OMINSOUNDS

---

## 🎯 Objetivo

Implementar o fluxo completo de checkout:
1. Usuário finaliza compra no carrinho
2. Sistema cria cobrança no Asaas
3. Usuário paga (Pix, Boleto ou Cartão)
4. Webhook confirma pagamento
5. Sistema libera download do beat

---

## 📚 Playbook Recebido

Já recebemos o playbook completo do Asaas. Principais pontos:

- **SDK**: `asaas-python-sdk`
- **Autenticação**: API Key no header
- **Sandbox**: Ambiente de testes com API keys específicas
- **Webhook**: Notificações de pagamento

---

## 🔑 1. Configurar Credenciais

### 1.1 Obter API Keys

1. Acesse [Asaas Sandbox](https://sandbox.asaas.com)
2. Crie uma conta de testes
3. Vá em **Integrações > API Key**
4. Gere uma nova chave (começa com `$aact_hmlg_`)

### 1.2 Adicionar ao Backend

**`/app/backend/.env`**

```env
# Asaas Configuration
ASAAS_API_KEY=$aact_hmlg_sua_chave_sandbox_aqui
ASAAS_ENVIRONMENT=sandbox
ASAAS_WEBHOOK_SECRET=seu_token_webhook_secreto_aqui
```

---

## 📦 2. Instalar Dependências

```bash
cd /app/backend
pip install httpx
pip freeze > requirements.txt
```

---

## 🛠️ 3. Criar Serviço Asaas

### 3.1 Criar arquivo de serviço

**`/app/backend/asaas_service.py`**

```python
import httpx
import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

class AsaasService:
    """Serviço para integração com Asaas"""
    
    def __init__(self):
        self.api_key = os.environ.get('ASAAS_API_KEY')
        self.environment = os.environ.get('ASAAS_ENVIRONMENT', 'sandbox')
        
        if self.environment == 'production':
            self.base_url = 'https://api.asaas.com/v3'
        else:
            self.base_url = 'https://api-sandbox.asaas.com/v3'
        
        self.headers = {
            'Content-Type': 'application/json',
            'access_token': self.api_key
        }
    
    async def create_payment(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cria uma cobrança no Asaas
        
        Args:
            order_data: {
                'customer_email': str,
                'customer_name': str,
                'amount': float,
                'description': str,
                'billing_type': 'PIX' | 'BOLETO' | 'CREDIT_CARD',
                'due_date': datetime,
                'external_reference': str (order_id)
            }
        
        Returns:
            Dict com informações do pagamento criado
        """
        
        try:
            # Criar ou buscar cliente
            customer = await self._get_or_create_customer(
                order_data['customer_email'],
                order_data['customer_name']
            )
            
            # Criar cobrança
            payment_payload = {
                'customer': customer['id'],
                'billingType': order_data['billing_type'],
                'value': order_data['amount'],
                'dueDate': order_data['due_date'].strftime('%Y-%m-%d'),
                'description': order_data['description'],
                'externalReference': order_data['external_reference'],
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payments",
                    json=payment_payload,
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                payment = response.json()
                
                logger.info(f"Pagamento criado no Asaas: {payment.get('id')}")
                
                return {
                    'payment_id': payment['id'],
                    'status': payment['status'],
                    'invoice_url': payment.get('invoiceUrl'),
                    'bank_slip_url': payment.get('bankSlipUrl'),
                    'pix_qrcode': payment.get('encodedImage'),  # QR Code Pix
                    'pix_copy_paste': payment.get('payload'),  # Pix Copia e Cola
                }
        
        except httpx.HTTPStatusError as e:
            logger.error(f"Erro HTTP ao criar pagamento: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Erro ao criar pagamento: {str(e)}")
            raise
    
    async def _get_or_create_customer(self, email: str, name: str) -> Dict[str, Any]:
        """Busca ou cria cliente no Asaas"""
        
        try:
            async with httpx.AsyncClient() as client:
                # Buscar cliente pelo email
                search_response = await client.get(
                    f"{self.base_url}/customers",
                    params={'email': email},
                    headers=self.headers,
                    timeout=30.0
                )
                
                customers = search_response.json()
                
                # Se já existe, retorna
                if customers.get('data') and len(customers['data']) > 0:
                    return customers['data'][0]
                
                # Se não existe, cria
                create_response = await client.post(
                    f"{self.base_url}/customers",
                    json={'name': name, 'email': email},
                    headers=self.headers,
                    timeout=30.0
                )
                
                create_response.raise_for_status()
                return create_response.json()
        
        except Exception as e:
            logger.error(f"Erro ao buscar/criar cliente: {str(e)}")
            raise
    
    async def get_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """Consulta status de um pagamento"""
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/payments/{payment_id}",
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                payment = response.json()
                
                return {
                    'payment_id': payment['id'],
                    'status': payment['status'],
                    'value': payment['value'],
                    'confirmed_date': payment.get('confirmedDate'),
                }
        
        except Exception as e:
            logger.error(f"Erro ao consultar pagamento: {str(e)}")
            raise

# Instância única
asaas_service = AsaasService()
```

---

## 🔀 4. Adicionar Rotas de Checkout

### 4.1 Atualizar server.py

**`/app/backend/server.py`**

Adicione no início do arquivo:

```python
from asaas_service import asaas_service
```

Substitua a rota `/api/orders` existente:

```python
@api_router.post("/orders")
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    """Criar pedido e iniciar checkout"""
    
    # Get beats info
    beat_ids = [item.beat_id for item in order_data.items]
    beats = await db.beats.find({"id": {"$in": beat_ids}}, {"_id": 0}).to_list(100)
    beats_dict = {beat["id"]: beat for beat in beats}
    
    # Create order items
    items = []
    total = 0
    
    for item_data in order_data.items:
        beat = beats_dict.get(item_data.beat_id)
        if not beat:
            raise HTTPException(status_code=404, detail=f"Beat {item_data.beat_id} not found")
        
        order_item = OrderItem(
            order_id="",
            beat_id=item_data.beat_id,
            beat_title=beat["title"],
            license_type=item_data.license_type,
            price=item_data.price
        )
        items.append(order_item)
        total += item_data.price
    
    # Create order
    order = Order(
        user_id=current_user["sub"],
        user_email=current_user["email"],
        total=total,
        status=OrderStatus.PENDING,
        billing_type=order_data.billing_type,
        items=items
    )
    
    # Update order_id in items
    for item in order.items:
        item.order_id = order.id
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    
    # Save order
    await db.orders.insert_one(order_dict)
    
    # Create payment in Asaas
    try:
        # Get user info
        user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
        
        payment_data = await asaas_service.create_payment({
            'customer_email': user['email'],
            'customer_name': user['name'],
            'amount': total,
            'description': f"OMINSOUNDS - Pedido #{order.id[:8]}",
            'billing_type': order_data.billing_type,
            'due_date': datetime.now(timezone.utc) + timedelta(days=3),
            'external_reference': order.id
        })
        
        # Update order with payment info
        await db.orders.update_one(
            {"id": order.id},
            {"$set": {
                "payment_id": payment_data['payment_id'],
                "invoice_url": payment_data.get('invoice_url'),
                "pix_qrcode": payment_data.get('pix_qrcode'),
                "pix_copy_paste": payment_data.get('pix_copy_paste'),
            }}
        )
        
        order_response = order.model_dump()
        order_response['payment_info'] = payment_data
        
        return order_response
    
    except Exception as e:
        logger.error(f"Erro ao criar pagamento: {str(e)}")
        # Mantém o pedido mas com status FAILED
        await db.orders.update_one(
            {"id": order.id},
            {"$set": {"status": "FAILED"}}
        )
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")
```

---

## 🔔 5. Webhook para Confirmação

### 5.1 Criar rota de webhook

Adicione em `server.py`:

```python
@api_router.post("/webhooks/asaas")
async def asaas_webhook(request: Request):
    """Recebe notificações do Asaas sobre pagamentos"""
    
    # Valida o token do webhook
    webhook_token = request.headers.get('asaas-access-token')
    expected_token = os.environ.get('ASAAS_WEBHOOK_SECRET')
    
    if webhook_token != expected_token:
        logger.warning("Webhook com token inválido")
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Parse o evento
    body = await request.json()
    event_type = body.get('event')
    payment = body.get('payment', {})
    
    logger.info(f"Webhook recebido: {event_type} - Payment: {payment.get('id')}")
    
    # Processar eventos
    if event_type == 'PAYMENT_CONFIRMED':
        await _handle_payment_confirmed(payment)
    elif event_type == 'PAYMENT_RECEIVED':
        await _handle_payment_confirmed(payment)  # Mesmo tratamento
    elif event_type == 'PAYMENT_OVERDUE':
        await _handle_payment_failed(payment)
    
    return {"status": "received"}

async def _handle_payment_confirmed(payment: dict):
    """Processa pagamento confirmado"""
    
    payment_id = payment.get('id')
    external_reference = payment.get('externalReference')  # Order ID
    
    # Atualiza status do pedido
    result = await db.orders.update_one(
        {"id": external_reference, "payment_id": payment_id},
        {"$set": {
            "status": "PAID",
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count > 0:
        logger.info(f"Pedido {external_reference} marcado como PAID")
        
        # Atualizar estatísticas dos beats
        order = await db.orders.find_one({"id": external_reference}, {"_id": 0})
        if order:
            for item in order['items']:
                await db.beats.update_one(
                    {"id": item['beat_id']},
                    {"$inc": {"sales": 1}}
                )
    else:
        logger.warning(f"Pedido {external_reference} não encontrado")

async def _handle_payment_failed(payment: dict):
    """Processa pagamento vencido/falho"""
    
    payment_id = payment.get('id')
    external_reference = payment.get('externalReference')
    
    await db.orders.update_one(
        {"id": external_reference, "payment_id": payment_id},
        {"$set": {"status": "FAILED"}}
    )
    
    logger.info(f"Pedido {external_reference} marcado como FAILED")
```

### 5.2 Configurar Webhook no Asaas

1. Acesse o painel Asaas
2. Vá em **Integrações > Webhooks**
3. Adicione a URL: `https://seu-dominio.com/api/webhooks/asaas`
4. Configure o token secreto (mesmo do `.env`)
5. Selecione os eventos:
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_RECEIVED`
   - `PAYMENT_OVERDUE`

---

## 🎨 6. Frontend - Página de Checkout

### 6.1 Criar CheckoutPage

**`/app/frontend/src/pages/Checkout.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ordersAPI } from '@/services/api';
import useCartStore from '@/store/cartStore';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('PIX');
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const orderData = {
        items: items.map(item => ({
          beat_id: item.beat.id,
          license_type: item.licenseType,
          price: item.price
        })),
        billing_type: selectedMethod
      };
      
      const response = await ordersAPI.create(orderData);
      const order = response.data;
      
      setPaymentInfo(order.payment_info);
      
      // Limpar carrinho
      clearCart();
      
      toast.success('Pedido criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (paymentInfo) {
    return (
      <div className="min-h-screen pt-24 pb-32">
        <div className="max-w-2xl mx-auto px-4 md:px-8">
          <div className="glass rounded-3xl p-8 text-center">
            <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
              Pagamento Criado!
            </h1>
            
            {selectedMethod === 'PIX' && paymentInfo.pix_qrcode && (
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  Escaneie o QR Code abaixo com seu app de banco
                </p>
                <img 
                  src={`data:image/png;base64,${paymentInfo.pix_qrcode}`}
                  alt="QR Code Pix"
                  className="mx-auto w-64 h-64"
                />
                <div className="p-4 bg-black/20 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-2">Pix Copia e Cola:</p>
                  <code className="text-xs break-all">{paymentInfo.pix_copy_paste}</code>
                </div>
              </div>
            )}
            
            {selectedMethod === 'BOLETO' && (
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  Seu boleto foi gerado com sucesso
                </p>
                <Button
                  onClick={() => window.open(paymentInfo.bank_slip_url, '_blank')}
                  className="rounded-full"
                >
                  Ver Boleto
                </Button>
              </div>
            )}
            
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="mt-8 rounded-full"
            >
              Ir para Minhas Compras
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <h1 className="text-4xl md:text-6xl font-bold mb-12" style={{ fontFamily: 'Manrope' }}>
          Finalizar Compra
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Method */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                Método de Pagamento
              </h2>
              
              <div className="space-y-4">
                {/* PIX */}
                <div
                  onClick={() => setSelectedMethod('PIX')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMethod === 'PIX'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Smartphone className="w-8 h-8" />
                    <div>
                      <h3 className="font-bold">Pix</h3>
                      <p className="text-sm text-muted-foreground">Pagamento instantâneo</p>
                    </div>
                  </div>
                </div>
                
                {/* BOLETO */}
                <div
                  onClick={() => setSelectedMethod('BOLETO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMethod === 'BOLETO'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Barcode className="w-8 h-8" />
                    <div>
                      <h3 className="font-bold">Boleto</h3>
                      <p className="text-sm text-muted-foreground">Vencimento em 3 dias</p>
                    </div>
                  </div>
                </div>
                
                {/* CREDIT_CARD */}
                <div
                  onClick={() => setSelectedMethod('CREDIT_CARD')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMethod === 'CREDIT_CARD'
                      ? 'border-primary bg-primary/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-8 h-8" />
                    <div>
                      <h3 className="font-bold">Cartão de Crédito</h3>
                      <p className="text-sm text-muted-foreground">Aprovação instantânea</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                Resumo
              </h2>
              
              <div className="space-y-4 mb-6">
                {items.map((item, index) => (
                  <div key={index} className="text-sm">
                    <p className="font-medium">{item.beat.title}</p>
                    <p className="text-muted-foreground">
                      Licença {item.licenseType} - R$ {item.price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    R$ {items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full rounded-full h-14 text-lg"
              >
                {loading ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
```

### 6.2 Adicionar rota no App.js

```jsx
import Checkout from '@/pages/Checkout';

// Na seção de rotas:
<Route path="/checkout" element={<Checkout />} />
```

---

## 🧪 7. Testar Integração

### 7.1 Teste Pix (Sandbox)

1. Crie um pedido
2. Selecione Pix
3. Asaas retorna QR Code
4. Use o simulador do Asaas para confirmar pagamento
5. Webhook atualiza status para PAID

### 7.2 Teste Boleto (Sandbox)

1. Crie um pedido
2. Selecione Boleto
3. Visualize o boleto gerado
4. Use o simulador para pagar
5. Webhook confirma

### 7.3 Verificar Webhook

```bash
# Ver logs do backend
tail -f /var/log/supervisor/backend.out.log | grep webhook
```

---

## 🛡️ 8. Segurança

### Checklist de Segurança

✅ API Key nunca exposta no frontend
✅ Webhook validado por token secreto
✅ HTTPS obrigatório em produção
✅ Validação de valores no backend
✅ Timeout nas requisições HTTP
✅ Logs de todas as transações
✅ Idempotência no webhook

---

## 📊 9. Monitoramento

### Métricas para Acompanhar

- Taxa de conversão (carrinho → checkout)
- Método de pagamento mais usado
- Tempo médio até confirmação
- Taxa de abandono
- Valor médio do pedido

---

## 🔧 10. Troubleshooting

### Pagamento não criado

```bash
# Verificar logs
tail -f /var/log/supervisor/backend.err.log

# Testar API Key
curl -H "access_token: $ASAAS_API_KEY" \
     https://api-sandbox.asaas.com/v3/customers
```

### Webhook não recebido

1. Verificar URL configurada no Asaas
2. Testar com ngrok: `ngrok http 8001`
3. Checar token secreto
4. Ver logs do Asaas (painel)

---

## ✅ Checklist Final

- [ ] API Keys configuradas
- [ ] Dependências instaladas
- [ ] Serviço Asaas criado
- [ ] Rotas de checkout implementadas
- [ ] Webhook configurado
- [ ] Frontend de checkout criado
- [ ] Testes em sandbox realizados
- [ ] Logs configurados
- [ ] Documentação atualizada

---

**Próximo passo**: [Sistema de Downloads](./DOWNLOAD_SYSTEM.md)
