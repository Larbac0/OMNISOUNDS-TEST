# 🚀 OMINSOUNDS - Guia Completo de Produção

> Documentação completa para colocar o marketplace em produção e começar a vender

---

## 📋 Índice

1. [Configuração de Produção](#1-configuração-de-produção)
2. [Sistema de Pagamentos Asaas](#2-sistema-de-pagamentos-asaas)
3. [Split de Pagamentos (80/20)](#3-split-de-pagamentos-8020)
4. [Deploy e Infraestrutura](#4-deploy-e-infraestrutura)
5. [Domínio e DNS](#5-domínio-e-dns)
6. [Testes Antes do Launch](#6-testes-antes-do-launch)
7. [Monitoramento](#7-monitoramento)
8. [Checklist de Go-Live](#8-checklist-de-go-live)

---

## 1. Configuração de Produção

### 1.1 Variáveis de Ambiente - Produção

#### Backend Production (.env)

```env
# ============================================
# OMINSOUNDS - PRODUCTION ENVIRONMENT
# ============================================

# Database
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=ominsounds_production

# Security
JWT_SECRET_KEY=SEU_SECRET_KEY_SUPER_SEGURO_MUDE_ISSO_AGORA_128_CHARS_MIN
DOWNLOAD_SECRET_KEY=OUTRO_SECRET_KEY_DIFERENTE_PARA_DOWNLOADS

# CORS
CORS_ORIGINS=https://www.ominsounds.com,https://ominsounds.com

# Asaas Payment Gateway
ASAAS_API_KEY=SEU_API_KEY_PRODUCAO_ASAAS
ASAAS_ENVIRONMENT=production
ASAAS_WEBHOOK_SECRET=SEU_TOKEN_WEBHOOK_SECRETO

# Split Settings (Produtor / Plataforma)
PLATFORM_COMMISSION_PERCENT=20
PRODUCER_COMMISSION_PERCENT=80

# Upload Limits
MAX_AUDIO_SIZE_MB=100
MAX_IMAGE_SIZE_MB=10

# Email (para notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contato@ominsounds.com
SMTP_PASSWORD=sua_senha_app

# URLs
FRONTEND_URL=https://www.ominsounds.com
BACKEND_URL=https://api.ominsounds.com

# Sentry (monitoramento de erros)
SENTRY_DSN=https://sua_chave_sentry

# Environment
ENVIRONMENT=production
DEBUG=false
```

#### Frontend Production (.env.production)

```env
REACT_APP_BACKEND_URL=https://api.ominsounds.com
REACT_APP_ENVIRONMENT=production
REACT_APP_SENTRY_DSN=https://sua_chave_sentry_frontend
REACT_APP_GOOGLE_ANALYTICS=G-XXXXXXXXXX
```

### 1.2 Segurança

#### Gerar Secret Keys Seguras

```python
# Script para gerar keys
import secrets

# JWT Secret (128 chars)
jwt_secret = secrets.token_urlsafe(96)
print(f"JWT_SECRET_KEY={jwt_secret}")

# Download Secret (128 chars)
download_secret = secrets.token_urlsafe(96)
print(f"DOWNLOAD_SECRET_KEY={download_secret}")

# Webhook Secret (64 chars)
webhook_secret = secrets.token_urlsafe(48)
print(f"ASAAS_WEBHOOK_SECRET={webhook_secret}")
```

#### SSL/HTTPS Obrigatório

```python
# Em server.py, adicionar middleware HTTPS redirect
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if os.environ.get('ENVIRONMENT') == 'production':
    app.add_middleware(HTTPSRedirectMiddleware)
```

---

## 2. Sistema de Pagamentos Asaas

### 2.1 Criar Conta Asaas de Produção

1. **Acesse**: https://www.asaas.com/
2. **Crie conta** de produção (não sandbox)
3. **Complete cadastro**:
   - Dados da empresa
   - Documentos (CNPJ, contrato social)
   - Conta bancária para recebimento
4. **Aguarde aprovação** (1-3 dias úteis)

### 2.2 Configurar API Key de Produção

1. Acesse painel Asaas
2. **Integrações > API Key**
3. Gere nova chave (começa com `$aact_prod_`)
4. **IMPORTANTE**: Salve em local seguro
5. Adicione ao `.env`: `ASAAS_API_KEY=SEU_TOKEN_AQUI`

### 2.3 Configurar Webhook

**URL do Webhook**: `https://api.ominsounds.com/api/webhooks/asaas`

**No painel Asaas:**
1. Integrações > Webhooks
2. Adicionar novo webhook
3. URL: Sua URL de produção
4. Token: O mesmo do `.env` (`ASAAS_WEBHOOK_SECRET`)
5. Eventos:
   - ✅ PAYMENT_CREATED
   - ✅ PAYMENT_CONFIRMED
   - ✅ PAYMENT_RECEIVED
   - ✅ PAYMENT_OVERDUE
   - ✅ PAYMENT_REFUNDED

### 2.4 Conta Bancária

**Configure conta para receber os 20% da plataforma:**

1. Painel Asaas > Conta Bancária
2. Adicione conta da OMINSOUNDS
3. Valide com depósito de confirmação
4. Configure split automático (ver seção 3)

---

## 3. Split de Pagamentos (80/20)

### 3.1 Como Funciona

```
Cliente compra beat por R$ 100,00
        |
        v
Asaas recebe pagamento
        |
        +-- R$ 80,00 → Produtor (80%)
        |
        +-- R$ 20,00 → OMINSOUNDS (20%)
```

### 3.2 Implementação Backend

Vou criar o arquivo completo de split de pagamentos.

**Criar arquivo**: `/app/backend/payment_split.py`

```python
import os
import logging
from typing import Dict, List
import httpx
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

PLATFORM_COMMISSION = float(os.environ.get('PLATFORM_COMMISSION_PERCENT', 20))
PRODUCER_COMMISSION = float(os.environ.get('PRODUCER_COMMISSION_PERCENT', 80))

class PaymentSplitService:
    """Serviço para gerenciar split de pagamentos"""
    
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
    
    def calculate_split(self, total_amount: float) -> Dict[str, float]:
        """
        Calcula split de pagamento
        
        Args:
            total_amount: Valor total da venda
        
        Returns:
            Dict com valores para produtor e plataforma
        """
        producer_amount = total_amount * (PRODUCER_COMMISSION / 100)
        platform_amount = total_amount * (PLATFORM_COMMISSION / 100)
        
        return {
            'total': total_amount,
            'producer_amount': round(producer_amount, 2),
            'platform_amount': round(platform_amount, 2),
            'producer_percent': PRODUCER_COMMISSION,
            'platform_percent': PLATFORM_COMMISSION
        }
    
    async def create_split_payment(
        self,
        customer_id: str,
        producer_wallet_id: str,
        total_amount: float,
        description: str,
        billing_type: str,
        due_date: str,
        external_reference: str
    ) -> Dict:
        """
        Cria pagamento com split automático
        
        Args:
            customer_id: ID do cliente no Asaas
            producer_wallet_id: ID da carteira do produtor no Asaas
            total_amount: Valor total
            description: Descrição do pagamento
            billing_type: PIX, BOLETO, CREDIT_CARD
            due_date: Data de vencimento (YYYY-MM-DD)
            external_reference: ID do pedido
        
        Returns:
            Dados do pagamento criado
        """
        
        split_info = self.calculate_split(total_amount)
        
        # Criar pagamento com split
        payment_payload = {
            'customer': customer_id,
            'billingType': billing_type,
            'value': total_amount,
            'dueDate': due_date,
            'description': description,
            'externalReference': external_reference,
            'split': [
                {
                    'walletId': producer_wallet_id,
                    'fixedValue': split_info['producer_amount'],
                    'description': f'Produtor - {PRODUCER_COMMISSION}%'
                }
                # Os 20% restantes ficam automaticamente na conta principal (OMINSOUNDS)
            ]
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payments",
                    json=payment_payload,
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                payment = response.json()
                
                logger.info(
                    f"Pagamento com split criado: {payment.get('id')} | "
                    f"Produtor: R$ {split_info['producer_amount']} | "
                    f"Plataforma: R$ {split_info['platform_amount']}"
                )
                
                return {
                    'payment_id': payment['id'],
                    'status': payment['status'],
                    'invoice_url': payment.get('invoiceUrl'),
                    'bank_slip_url': payment.get('bankSlipUrl'),
                    'pix_qrcode': payment.get('encodedImage'),
                    'pix_copy_paste': payment.get('payload'),
                    'split_info': split_info
                }
        
        except httpx.HTTPStatusError as e:
            logger.error(f"Erro HTTP ao criar split: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Erro ao criar split: {str(e)}")
            raise
    
    async def create_producer_account(self, producer_data: Dict) -> str:
        """
        Cria subconta (wallet) para o produtor no Asaas
        
        Args:
            producer_data: {
                'name': str,
                'email': str,
                'cpfCnpj': str,
                'phone': str,
                'mobilePhone': str,
                'address': str,
                'addressNumber': str,
                'province': str,
                'postalCode': str
            }
        
        Returns:
            wallet_id: ID da carteira do produtor
        """
        
        try:
            async with httpx.AsyncClient() as client:
                # Criar subconta
                response = await client.post(
                    f"{self.base_url}/accounts",
                    json=producer_data,
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                account = response.json()
                
                wallet_id = account['walletId']
                
                logger.info(f"Subconta criada para produtor: {wallet_id}")
                
                return wallet_id
        
        except Exception as e:
            logger.error(f"Erro ao criar subconta: {str(e)}")
            raise
    
    async def get_producer_balance(self, wallet_id: str) -> Dict:
        """
        Consulta saldo do produtor
        
        Args:
            wallet_id: ID da carteira do produtor
        
        Returns:
            Informações de saldo
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/wallets/{wallet_id}/balance",
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                return response.json()
        
        except Exception as e:
            logger.error(f"Erro ao consultar saldo: {str(e)}")
            raise
    
    async def request_producer_transfer(self, wallet_id: str, amount: float) -> Dict:
        """
        Solicita transferência do saldo do produtor para conta bancária
        
        Args:
            wallet_id: ID da carteira do produtor
            amount: Valor a transferir
        
        Returns:
            Dados da transferência
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/transfers",
                    json={
                        'walletId': wallet_id,
                        'value': amount
                    },
                    headers=self.headers,
                    timeout=30.0
                )
                
                response.raise_for_status()
                return response.json()
        
        except Exception as e:
            logger.error(f"Erro ao solicitar transferência: {str(e)}")
            raise

# Instância única
payment_split_service = PaymentSplitService()
```

### 3.3 Atualizar Models

Adicionar campo `asaas_wallet_id` ao modelo User:

```python
# Em /app/backend/models.py

class User(BaseModel):
    # ... campos existentes ...
    asaas_wallet_id: Optional[str] = None  # ID da carteira no Asaas
    bank_account: Optional[Dict] = None    # Dados bancários
```

### 3.4 Endpoint para Produtor Cadastrar Dados Bancários

```python
# Em /app/backend/server.py

from payment_split import payment_split_service

@api_router.post("/producer/bank-account")
async def setup_producer_bank_account(
    bank_data: dict,
    current_user: dict = Depends(get_current_producer)
):
    """
    Produtor cadastra dados bancários para recebimento
    
    Payload:
    {
        "name": "Nome Completo",
        "cpfCnpj": "123.456.789-00",
        "email": "produtor@email.com",
        "phone": "1199999999",
        "mobilePhone": "11999999999",
        "address": "Rua Exemplo",
        "addressNumber": "123",
        "province": "São Paulo",
        "postalCode": "01234-567",
        "bank": {
            "bank": "001",  # Código do banco
            "accountType": "CONTA_CORRENTE",
            "agencia": "1234",
            "conta": "12345-6",
            "accountName": "Nome na Conta"
        }
    }
    """
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    
    # Verificar se já tem wallet
    if user.get('asaas_wallet_id'):
        raise HTTPException(
            status_code=400,
            detail="Dados bancários já cadastrados"
        )
    
    try:
        # Criar subconta no Asaas
        wallet_id = await payment_split_service.create_producer_account(bank_data)
        
        # Atualizar usuário
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {
                "asaas_wallet_id": wallet_id,
                "bank_account": bank_data.get('bank'),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "message": "Dados bancários cadastrados com sucesso",
            "wallet_id": wallet_id
        }
    
    except Exception as e:
        logger.error(f"Erro ao cadastrar dados bancários: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Erro ao processar dados bancários"
        )

@api_router.get("/producer/earnings")
async def get_producer_earnings(current_user: dict = Depends(get_current_producer)):
    """
    Retorna ganhos do produtor
    """
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    
    if not user.get('asaas_wallet_id'):
        return {
            "total_earnings": 0,
            "available_balance": 0,
            "pending_balance": 0,
            "message": "Configure seus dados bancários primeiro"
        }
    
    try:
        # Consultar saldo no Asaas
        balance = await payment_split_service.get_producer_balance(
            user['asaas_wallet_id']
        )
        
        # Buscar vendas do produtor
        orders = await db.orders.find(
            {"status": "PAID"},
            {"_id": 0}
        ).to_list(1000)
        
        total_earnings = 0
        for order in orders:
            for item in order['items']:
                # Buscar beat para verificar se é do produtor
                beat = await db.beats.find_one(
                    {"id": item['beat_id'], "producer_id": current_user["sub"]},
                    {"_id": 0}
                )
                if beat:
                    split = payment_split_service.calculate_split(item['price'])
                    total_earnings += split['producer_amount']
        
        return {
            "total_earnings": round(total_earnings, 2),
            "available_balance": balance.get('availableBalance', 0),
            "pending_balance": balance.get('pendingBalance', 0),
            "commission_percent": PRODUCER_COMMISSION
        }
    
    except Exception as e:
        logger.error(f"Erro ao consultar ganhos: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao consultar ganhos")

@api_router.post("/producer/withdraw")
async def request_withdrawal(
    amount: float,
    current_user: dict = Depends(get_current_producer)
):
    """
    Produtor solicita saque
    """
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    
    if not user.get('asaas_wallet_id'):
        raise HTTPException(
            status_code=400,
            detail="Configure seus dados bancários primeiro"
        )
    
    if amount < 10:
        raise HTTPException(
            status_code=400,
            detail="Valor mínimo para saque: R$ 10,00"
        )
    
    try:
        # Verificar saldo disponível
        balance = await payment_split_service.get_producer_balance(
            user['asaas_wallet_id']
        )
        
        available = balance.get('availableBalance', 0)
        
        if amount > available:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Disponível: R$ {available:.2f}"
            )
        
        # Solicitar transferência
        transfer = await payment_split_service.request_producer_transfer(
            user['asaas_wallet_id'],
            amount
        )
        
        # Registrar saque
        withdrawal = {
            "id": str(uuid.uuid4()),
            "producer_id": current_user["sub"],
            "amount": amount,
            "status": "PENDING",
            "transfer_id": transfer.get('id'),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.withdrawals.insert_one(withdrawal)
        
        return {
            "message": "Saque solicitado com sucesso",
            "amount": amount,
            "estimated_date": "1-2 dias úteis"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao solicitar saque: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao processar saque")
```

### 3.5 Atualizar Criação de Pedidos com Split

```python
# Atualizar rota POST /api/orders em server.py

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    # ... código existente ...
    
    # Criar order
    order = Order(...)
    
    # Salvar order
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    await db.orders.insert_one(order_dict)
    
    # Criar pagamento com SPLIT
    try:
        user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
        
        # Para simplificar, vamos pegar o primeiro beat (ou você pode fazer split proporcional)
        first_item = order.items[0]
        beat = beats_dict[first_item.beat_id]
        
        # Buscar dados do produtor
        producer = await db.users.find_one(
            {"id": beat['producer_id']},
            {"_id": 0}
        )
        
        if not producer.get('asaas_wallet_id'):
            # Se produtor não tem wallet, criar pagamento normal (sem split)
            logger.warning(f"Produtor {producer['id']} sem wallet configurada")
            # Usar método antigo sem split
        else:
            # Criar pagamento COM SPLIT
            payment_data = await payment_split_service.create_split_payment(
                customer_id=...,  # ID do customer no Asaas
                producer_wallet_id=producer['asaas_wallet_id'],
                total_amount=total,
                description=f"OMINSOUNDS - Pedido #{order.id[:8]}",
                billing_type=order_data.billing_type,
                due_date=(datetime.now(timezone.utc) + timedelta(days=3)).strftime('%Y-%m-%d'),
                external_reference=order.id
            )
        
        # Atualizar order com payment info
        await db.orders.update_one(
            {"id": order.id},
            {"$set": {
                "payment_id": payment_data['payment_id'],
                "split_info": payment_data['split_info'],
                "invoice_url": payment_data.get('invoice_url'),
                "pix_qrcode": payment_data.get('pix_qrcode'),
                "pix_copy_paste": payment_data.get('pix_copy_paste'),
            }}
        )
        
        return {**order.model_dump(), 'payment_info': payment_data}
    
    except Exception as e:
        logger.error(f"Erro ao criar pagamento: {str(e)}")
        await db.orders.update_one(
            {"id": order.id},
            {"$set": {"status": "FAILED"}}
        )
        raise HTTPException(status_code=500, detail="Erro ao processar pagamento")
```

---

## 4. Deploy e Infraestrutura

### 4.1 Opções de Hospedagem

#### Opção A: Render.com (Recomendado - Fácil)

**Backend:**
```yaml
# render.yaml
services:
  - type: web
    name: ominsounds-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn server:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: MONGO_URL
        sync: false
      - key: JWT_SECRET_KEY
        sync: false
      - key: ASAAS_API_KEY
        sync: false
```

**Frontend:**
- Build: `yarn build`
- Publish: `build/`
- Deploy como Static Site

#### Opção B: AWS (Escalável)

**Backend:**
- EC2 ou Elastic Beanstalk
- RDS para MongoDB (ou MongoDB Atlas)
- S3 para uploads
- CloudFront para CDN

**Frontend:**
- S3 + CloudFront
- Route 53 para DNS

#### Opção C: Digital Ocean (Custo-benefício)

**Backend:**
- App Platform ou Droplet
- Managed MongoDB
- Spaces para uploads

**Frontend:**
- App Platform (Static Site)

### 4.2 MongoDB Atlas (Recomendado)

1. **Criar cluster**: https://cloud.mongodb.com/
2. **Escolher região**: São Paulo (sa-east-1)
3. **Tier**: M10 ou superior para produção
4. **Backup automático**: Ativar
5. **Network Access**: Permitir IPs da aplicação
6. **Database User**: Criar com senha forte
7. **Connection String**: Copiar para `.env`

```
mongodb+srv://user:password@cluster.mongodb.net/ominsounds?retryWrites=true&w=majority
```

### 4.3 Armazenamento de Arquivos

#### AWS S3

```python
# Instalar: pip install boto3

import boto3
from botocore.exceptions import ClientError

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    region_name='sa-east-1'
)

def upload_to_s3(file_path: str, bucket: str, key: str) -> str:
    """Upload arquivo para S3"""
    try:
        s3_client.upload_file(file_path, bucket, key)
        url = f"https://{bucket}.s3.amazonaws.com/{key}"
        return url
    except ClientError as e:
        logger.error(f"Erro no upload S3: {e}")
        raise
```

---

## 5. Domínio e DNS

### 5.1 Registrar Domínio

**Sugestões:**
- ominsounds.com.br
- ominsounds.com
- omnisounds.com.br

**Registradores:**
- Registro.br (nacional)
- GoDaddy
- Namecheap

### 5.2 Configurar DNS

```
Tipo  | Nome      | Valor
------|-----------|------------------
A     | @         | IP do servidor
A     | www       | IP do servidor
CNAME | api       | backend.render.com
TXT   | @         | Verificação Google
```

### 5.3 SSL/HTTPS

**Let's Encrypt (Grátis):**

```bash
# No servidor
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ominsounds.com -d www.ominsounds.com
```

**Ou usar SSL do provider** (Render, Vercel já inclui)

---

## 6. Testes Antes do Launch

### 6.1 Checklist de Testes

#### Funcionalidades

```
□ Registro de usuário (USER e PRODUCER)
□ Login e logout
□ Upload de beat (áudio + imagem)
□ Listagem e filtros de beats
□ Player funcionando
□ Adicionar ao carrinho
□ Processo de checkout completo
□ Pagamento Pix (teste real)
□ Pagamento Boleto (teste real)
□ Webhook recebendo notificações
□ Status do pedido atualizando
□ Download após pagamento
□ Limite de downloads respeitado
□ Split 80/20 calculado corretamente
□ Produtor recebe na wallet
□ Produtor consegue sacar
□ Dashboard produtor com stats corretas
□ Dashboard usuário funcional
```

#### Segurança

```
□ HTTPS ativo em todo site
□ Tokens JWT expirando corretamente
□ Rotas protegidas (auth required)
□ CORS configurado
□ Rate limiting ativo
□ Validação de uploads
□ SQL/NoSQL injection protegido
□ XSS protegido
□ CSRF protegido
```

#### Performance

```
□ Lighthouse score > 90
□ Tempo de carregamento < 3s
□ Imagens otimizadas
□ Lazy loading implementado
□ CDN configurado
□ Gzip/Brotli ativo
```

### 6.2 Testar Fluxo Completo

**Como Produtor:**
1. Registrar como PRODUCER
2. Configurar dados bancários
3. Upload de 3 beats
4. Verificar se aparecem na exploração
5. Ver dashboard de vendas

**Como Comprador:**
1. Registrar como USER
2. Navegar e ouvir beats
3. Adicionar ao carrinho
4. Fazer checkout com Pix
5. Pagar (usar ambiente de teste Asaas)
6. Verificar se pedido mudou para PAID
7. Fazer download do beat
8. Verificar se limite de 3 downloads funciona

**Como Plataforma:**
1. Verificar se 20% caiu na conta principal
2. Verificar se 80% caiu na wallet do produtor
3. Acessar painel Asaas e confirmar split

---

## 7. Monitoramento

### 7.1 Sentry (Erros)

```bash
# Instalar
pip install sentry-sdk[fastapi]
yarn add @sentry/react
```

**Backend:**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[FastApiIntegration()],
    environment="production",
    traces_sample_rate=1.0,
)
```

**Frontend:**
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: "production",
});
```

### 7.2 Google Analytics

```html
<!-- Em public/index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 7.3 Logs

```python
# Configurar logging estruturado
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
        })

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
```

---

## 8. Checklist de Go-Live

### Pré-Launch (1 semana antes)

```
□ Todos os testes passando
□ Domínio registrado e DNS configurado
□ SSL ativo e funcionando
□ Conta Asaas de produção aprovada
□ Webhook configurado e testado
□ Banco de dados de produção criado
□ Backups automáticos configurados
□ Monitoramento (Sentry + Analytics) ativo
□ Email SMTP configurado
□ Termos de Uso e Privacidade publicados
□ FAQ preparado
□ Suporte (email/chat) configurado
```

### Launch Day

```
□ Deploy backend em produção
□ Deploy frontend em produção
□ Smoke tests em produção
□ Cadastrar 5-10 beats de exemplo
□ Criar 2-3 contas de produtor de teste
□ Testar compra real (Pix R$ 1,00)
□ Confirmar split funcionando
□ Anúncio em redes sociais
□ Email para lista de espera
□ Monitorar logs por 24h
```

### Pós-Launch (primeira semana)

```
□ Monitorar erros no Sentry
□ Acompanhar métricas (GA)
□ Responder feedback de usuários
□ Ajustar performance se necessário
□ Documentar bugs encontrados
□ Planejar hotfixes
□ Comunicar updates aos usuários
```

---

## 📞 Suporte

### Para Produtores

**Email**: produtores@ominsounds.com

**Tópicos comuns:**
- Como configurar dados bancários
- Quanto tempo para receber
- Como funciona o split 80/20
- Limite de uploads
- Políticas de uso

### Para Compradores

**Email**: suporte@ominsounds.com

**Tópicos comuns:**
- Problemas no pagamento
- Download não funciona
- Dúvidas sobre licenças
- Reembolsos
- Problemas técnicos

---

## 🎯 Próximos Passos Após Launch

1. **Semana 1-2**: Estabilizar e corrigir bugs críticos
2. **Semana 3-4**: Implementar melhorias de UX baseadas em feedback
3. **Mês 2**: Marketing e aquisição de produtores
4. **Mês 3**: Features de engajamento (avaliações, seguir)
5. **Mês 4+**: Planos premium, API pública, white-label

---

**Boa sorte no lançamento!** 🚀🎵

*A jornada está apenas começando...*
