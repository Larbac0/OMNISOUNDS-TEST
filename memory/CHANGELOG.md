# Changelog - OMINSOUNDS

## [1.1.0] - 2026-02-13

### Configurações Adicionadas

#### AWS S3 - Armazenamento de Arquivos
**Arquivo modificado:** `/app/backend/.env`

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `AWS_ACCESS_KEY_ID` | `AKIAUW4RBFJ6MYVVAMUF` | Chave de acesso AWS |
| `AWS_SECRET_ACCESS_KEY` | `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` | Chave secreta AWS |
| `AWS_REGION` | `sa-east-1` | Região São Paulo |
| `S3_BUCKET_NAME` | `omnisounds-beats` | Nome do bucket |

**Funcionamento:**
- Uploads de áudio vão para: `s3://omnisounds-beats/audio/`
- Uploads de imagens vão para: `s3://omnisounds-beats/images/`
- URLs públicas geradas automaticamente

---

#### Asaas - Gateway de Pagamentos
**Arquivo modificado:** `/app/backend/.env`

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `ASAAS_API_KEY` | `$aact_hmlg_000...` | Chave de API (Sandbox) |
| `ASAAS_API_URL` | `https://sandbox.asaas.com/api/v3` | URL da API Sandbox |
| `ASAAS_PLATFORM_WALLET_ID` | `b396b737-a7ef-407a-914f-a812f45db20a` | Wallet da plataforma (20%) |

**Funcionamento:**
- PIX: Gera QR Code automático
- Cartão de Crédito: Processamento instantâneo
- Boleto: Vencimento em 3 dias
- Split: 80% produtor / 20% plataforma

---

### Novas Funcionalidades

#### Preview de 30 Segundos
**Arquivos modificados:**
- `/app/backend/server.py` - Endpoint de streaming
- `/app/frontend/src/components/GlobalPlayer.jsx` - Player com limite de tempo
- `/app/frontend/src/store/playerStore.js` - Estado do preview

**Comportamento:**
- Usuários não logados: Preview de 30 segundos
- Usuários logados: Preview de 30 segundos (beat não comprado)
- Beat comprado: Áudio completo

---

## [1.0.0] - 2026-02-13

### MVP Inicial
- Sistema de autenticação (JWT)
- CRUD de beats
- Carrinho de compras
- Checkout com PIX/Cartão/Boleto
- Dashboard do produtor
- Player global
