# OMINSOUNDS - Marketplace de Beats

## Visão Geral
OMINSOUNDS é um marketplace de beats inspirado em BeatStars e Beatplace, focado no mercado brasileiro. Permite que produtores vendam seus beats e artistas comprem licenças.

## Stack Tecnológico
- **Frontend:** React 19 + TailwindCSS + Zustand + React Router
- **Backend:** FastAPI (Python) + MongoDB
- **Pagamentos:** Asaas (PIX, Cartão de Crédito, Boleto) com split 80/20
- **Armazenamento:** AWS S3 (quando configurado) ou local

## Status: MVP Funcional ✅

### Funcionalidades Implementadas

#### Autenticação
- [x] Registro de usuário (USER/PRODUCER)
- [x] Login com JWT
- [x] Proteção de rotas

#### Beats
- [x] Upload de beats (áudio + imagem)
- [x] Listagem com filtros (gênero, BPM, tonalidade, busca)
- [x] Página de detalhes do beat com waveform
- [x] Seleção de licença (MP3/WAV/Exclusiva)

#### Carrinho e Checkout
- [x] Adicionar ao carrinho
- [x] Página do carrinho
- [x] Checkout com 3 métodos de pagamento
- [x] Criação de pedidos

#### Produtor
- [x] Dashboard do produtor
- [x] Upload de beats
- [x] Perfil público do produtor
- [x] Estatísticas (beats, plays, vendas)

#### Pagamentos (Asaas)
- [x] Integração PIX com QR Code
- [x] Integração Cartão de Crédito
- [x] Integração Boleto
- [x] Split de pagamento 80/20 (produtor/plataforma)
- [x] Webhook para confirmação

### Credenciais de Teste
- **Produtor:** producer@test.com / test123456
- **Usuário:** user@test.com / test123456

## Configuração Necessária

### Backend (.env)
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
JWT_SECRET_KEY="sua-chave-secreta"
ASAAS_API_KEY="sua-chave-asaas"
ASAAS_API_URL="https://sandbox.asaas.com/api/v3"
ASAAS_PLATFORM_WALLET_ID="sua-wallet-id"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
S3_BUCKET_NAME=""
```

## Backlog

### P1 - Alta Prioridade
- [ ] Configurar credenciais Asaas de produção
- [ ] Configurar AWS S3 para armazenamento
- [ ] Sistema de download pós-pagamento
- [ ] Favoritos funcionais

### P2 - Média Prioridade
- [ ] Dashboard do usuário com histórico
- [ ] Analytics avançado para produtores
- [ ] Sistema de avaliações
- [ ] Notificações por email

### P3 - Baixa Prioridade
- [ ] Busca avançada com AI
- [ ] Recomendações personalizadas
- [ ] App mobile
- [ ] Sistema de mensagens

## Arquitetura de Arquivos

```
/app
├── backend/
│   ├── server.py (API principal)
│   ├── models.py (Modelos Pydantic)
│   ├── auth.py (JWT authentication)
│   ├── services/
│   │   ├── asaas_service.py
│   │   └── s3_service.py
│   └── uploads/ (arquivos locais)
├── frontend/
│   └── src/
│       ├── pages/ (BeatDetails, Checkout, Orders, etc.)
│       ├── components/ (BeatCard, GlobalPlayer, etc.)
│       ├── store/ (Zustand stores)
│       └── services/api.js
└── test_reports/
```

## Endpoints da API

### Autenticação
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual

### Beats
- `GET /api/beats` - Listar (com filtros)
- `GET /api/beats/:id` - Detalhes
- `POST /api/beats` - Criar (produtor)
- `PUT /api/beats/:id` - Atualizar
- `DELETE /api/beats/:id` - Deletar

### Pedidos
- `POST /api/orders` - Criar pedido
- `GET /api/orders` - Listar pedidos
- `GET /api/orders/:id/download/:beat_id` - Download

### Produtor
- `GET /api/producers/:id` - Perfil público
- `GET /api/producer/stats` - Estatísticas
- `GET /api/producer/beats` - Beats do produtor

### Webhook
- `POST /webhook/asaas` - Confirmação de pagamento

---
Última atualização: 2026-02-13
