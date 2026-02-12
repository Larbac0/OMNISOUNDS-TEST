# 💾 Sistema de Downloads Pós-Pagamento

> Implementar sistema seguro de downloads de beats após confirmação de pagamento

---

## 🎯 Objetivo

Criar um sistema que:
1. Libera downloads apenas após pagamento confirmado
2. Gera links de download temporários e seguros
3. Limita número de downloads por pedido
4. Rastreia histórico de downloads
5. Fornece diferentes formatos por tipo de licença

---

## 📊 Fluxo do Sistema

```
1. Usuário compra beat
   ↓
2. Pagamento confirmado (webhook)
   ↓
3. Status do pedido = PAID
   ↓
4. Usuário acessa "Minhas Compras"
   ↓
5. Clica em "Download"
   ↓
6. Backend gera link temporário (JWT)
   ↓
7. Download inicia
   ↓
8. Sistema registra download
```

---

## 💾 1. Estrutura de Arquivos

### 1.1 Organização no Backend

```
/app/backend/uploads/
├── audio/
│   ├── previews/        # MP3 com tag (preview público)
│   │   └── {beat_id}_preview.mp3
│   ├── mp3/             # MP3 completo sem tag
│   │   └── {beat_id}_mp3.mp3
│   ├── wav/             # WAV sem compressão
│   │   └── {beat_id}_wav.wav
│   └── stems/           # Stems (apenas exclusivo)
│       └── {beat_id}_stems.zip
└── images/
```

---

## 🔐 2. Modelo de Download

### 2.1 Adicionar ao models.py

**`/app/backend/models.py`**

```python
class Download(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    order_id: str
    beat_id: str
    license_type: LicenseType
    download_count: int = 0
    max_downloads: int = 3  # Limite de downloads
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    downloaded_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DownloadLink(BaseModel):
    """Response para geração de link de download"""
    download_url: str
    expires_at: datetime
    remaining_downloads: int
```

---

## 🔑 3. Serviço de Downloads

### 3.1 Criar download_service.py

**`/app/backend/download_service.py`**

```python
import os
import jwt
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

DOWNLOAD_SECRET = os.environ.get('JWT_SECRET_KEY', 'download-secret')
DOWNLOAD_EXPIRY_MINUTES = 30  # Link válido por 30 minutos

class DownloadService:
    """Serviço para gerenciar downloads seguros"""
    
    @staticmethod
    def generate_download_token(
        user_id: str,
        order_id: str,
        beat_id: str,
        license_type: str
    ) -> str:
        """
        Gera token JWT temporário para download
        
        Token inclui:
        - user_id, order_id, beat_id, license_type
        - Expira em 30 minutos
        - Assinado com secret key
        """
        
        payload = {
            'user_id': user_id,
            'order_id': order_id,
            'beat_id': beat_id,
            'license_type': license_type,
            'exp': datetime.now(timezone.utc) + timedelta(minutes=DOWNLOAD_EXPIRY_MINUTES),
            'iat': datetime.now(timezone.utc),
        }
        
        token = jwt.encode(payload, DOWNLOAD_SECRET, algorithm='HS256')
        return token
    
    @staticmethod
    def verify_download_token(token: str) -> dict:
        """
        Verifica e decodifica token de download
        
        Raises:
            jwt.ExpiredSignatureError: Token expirado
            jwt.InvalidTokenError: Token inválido
        """
        
        try:
            payload = jwt.decode(token, DOWNLOAD_SECRET, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token de download expirado")
            raise
        except jwt.InvalidTokenError:
            logger.warning("Token de download inválido")
            raise
    
    @staticmethod
    def get_file_path(beat_id: str, license_type: str) -> Optional[Path]:
        """
        Retorna o caminho do arquivo baseado na licença
        
        MP3: arquivo MP3 completo
        WAV: arquivo WAV
        EXCLUSIVE: arquivo ZIP com stems
        """
        
        uploads_dir = Path(__file__).parent / "uploads" / "audio"
        
        if license_type == "MP3":
            file_path = uploads_dir / "mp3" / f"{beat_id}_mp3.mp3"
        elif license_type == "WAV":
            file_path = uploads_dir / "wav" / f"{beat_id}_wav.wav"
        elif license_type == "EXCLUSIVE":
            file_path = uploads_dir / "stems" / f"{beat_id}_stems.zip"
        else:
            return None
        
        if file_path.exists():
            return file_path
        
        return None
    
    @staticmethod
    def generate_file_hash(file_path: Path) -> str:
        """
        Gera hash SHA256 do arquivo para validação de integridade
        """
        
        sha256 = hashlib.sha256()
        
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        
        return sha256.hexdigest()

download_service = DownloadService()
```

---

## 🔀 4. Rotas de Download

### 4.1 Adicionar rotas no server.py

**`/app/backend/server.py`**

```python
from fastapi.responses import FileResponse, StreamingResponse
from download_service import download_service
from models import Download, DownloadLink
import mimetypes

# ==================== DOWNLOAD ROUTES ====================

@api_router.post("/downloads/generate", response_model=DownloadLink)
async def generate_download_link(
    order_id: str,
    beat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Gera link temporário de download para um beat comprado
    
    Validações:
    - Pedido pertence ao usuário
    - Pedido está pago (status=PAID)
    - Beat faz parte do pedido
    - Não excedeu limite de downloads
    """
    
    # Buscar pedido
    order = await db.orders.find_one(
        {"id": order_id, "user_id": current_user["sub"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    # Verificar se está pago
    if order["status"] != "PAID":
        raise HTTPException(
            status_code=403,
            detail="Pagamento ainda não confirmado"
        )
    
    # Verificar se beat faz parte do pedido
    beat_item = None
    for item in order["items"]:
        if item["beat_id"] == beat_id:
            beat_item = item
            break
    
    if not beat_item:
        raise HTTPException(status_code=404, detail="Beat não encontrado no pedido")
    
    # Buscar ou criar registro de download
    download_record = await db.downloads.find_one(
        {
            "user_id": current_user["sub"],
            "order_id": order_id,
            "beat_id": beat_id
        },
        {"_id": 0}
    )
    
    if not download_record:
        # Criar novo registro
        download = Download(
            user_id=current_user["sub"],
            order_id=order_id,
            beat_id=beat_id,
            license_type=beat_item["license_type"]
        )
        
        download_dict = download.model_dump()
        download_dict["created_at"] = download_dict["created_at"].isoformat()
        
        await db.downloads.insert_one(download_dict)
        download_record = download_dict
    
    # Verificar limite de downloads
    if download_record["download_count"] >= download_record["max_downloads"]:
        raise HTTPException(
            status_code=403,
            detail=f"Limite de downloads atingido ({download_record['max_downloads']})"
        )
    
    # Gerar token
    token = download_service.generate_download_token(
        user_id=current_user["sub"],
        order_id=order_id,
        beat_id=beat_id,
        license_type=beat_item["license_type"]
    )
    
    # Construir URL de download
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    download_url = f"{backend_url}/api/downloads/file?token={token}"
    
    return DownloadLink(
        download_url=download_url,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        remaining_downloads=download_record["max_downloads"] - download_record["download_count"]
    )

@api_router.get("/downloads/file")
async def download_file(token: str, request: Request):
    """
    Faz download do arquivo usando token temporário
    
    - Valida token
    - Verifica limites
    - Registra download
    - Stream do arquivo
    """
    
    try:
        # Verificar token
        payload = download_service.verify_download_token(token)
        
        user_id = payload['user_id']
        order_id = payload['order_id']
        beat_id = payload['beat_id']
        license_type = payload['license_type']
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Link de download expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Link de download inválido")
    
    # Buscar registro de download
    download_record = await db.downloads.find_one(
        {
            "user_id": user_id,
            "order_id": order_id,
            "beat_id": beat_id
        },
        {"_id": 0}
    )
    
    if not download_record:
        raise HTTPException(status_code=404, detail="Registro de download não encontrado")
    
    # Verificar limite
    if download_record["download_count"] >= download_record["max_downloads"]:
        raise HTTPException(status_code=403, detail="Limite de downloads atingido")
    
    # Buscar arquivo
    file_path = download_service.get_file_path(beat_id, license_type)
    
    if not file_path or not file_path.exists():
        logger.error(f"Arquivo não encontrado: {beat_id} - {license_type}")
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    # Atualizar contador de downloads
    await db.downloads.update_one(
        {
            "user_id": user_id,
            "order_id": order_id,
            "beat_id": beat_id
        },
        {
            "$inc": {"download_count": 1},
            "$set": {
                "downloaded_at": datetime.now(timezone.utc).isoformat(),
                "ip_address": request.client.host,
                "user_agent": request.headers.get("user-agent")
            }
        }
    )
    
    logger.info(f"Download iniciado: {user_id} - {beat_id} - {license_type}")
    
    # Determinar tipo MIME
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "application/octet-stream"
    
    # Retornar arquivo
    return FileResponse(
        path=str(file_path),
        media_type=mime_type,
        filename=file_path.name,
        headers={
            "Content-Disposition": f"attachment; filename={file_path.name}"
        }
    )

@api_router.get("/downloads/history")
async def get_download_history(current_user: dict = Depends(get_current_user)):
    """
    Retorna histórico de downloads do usuário
    """
    
    downloads = await db.downloads.find(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    ).to_list(100)
    
    # Enriquecer com informações do beat
    for download in downloads:
        beat = await db.beats.find_one({"id": download["beat_id"]}, {"_id": 0})
        if beat:
            download["beat_title"] = beat["title"]
            download["beat_image"] = beat.get("image_url")
    
    return downloads
```

---

## 🎨 5. Frontend - Página de Compras

### 5.1 Atualizar services/api.js

```javascript
export const downloadsAPI = {
  generateLink: (orderId, beatId) => 
    api.post('/downloads/generate', null, {
      params: { order_id: orderId, beat_id: beatId }
    }),
  getHistory: () => api.get('/downloads/history'),
};
```

### 5.2 Criar componente PurchasesPage

**`/app/frontend/src/pages/user/Purchases.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ordersAPI, downloadsAPI } from '@/services/api';
import { toast } from 'sonner';

const Purchases = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getAll();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao carregar compras');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (orderId, beatId) => {
    try {
      const response = await downloadsAPI.generateLink(orderId, beatId);
      const { download_url } = response.data;
      
      // Abrir em nova aba para download
      window.open(download_url, '_blank');
      
      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Error generating download:', error);
      const message = error.response?.data?.detail || 'Erro ao gerar download';
      toast.error(message);
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
          Minhas Compras
        </h1>

        {orders.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <p className="text-muted-foreground mb-4">Você ainda não fez nenhuma compra</p>
            <Button onClick={() => window.location.href = '/explore'}>
              Explorar Beats
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="glass rounded-2xl p-6">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="font-bold" style={{ fontFamily: 'Manrope' }}>
                      Pedido #{order.id.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === 'PAID' ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-500 font-medium">Pago</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-yellow-500" />
                        <span className="text-yellow-500 font-medium">Pendente</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.beat_title}</p>
                        <p className="text-sm text-muted-foreground">
                          Licença {item.license_type} - R$ {item.price.toFixed(2)}
                        </p>
                      </div>
                      {order.status === 'PAID' && (
                        <Button
                          onClick={() => handleDownload(order.id, item.beat_id)}
                          className="rounded-full gap-2"
                          data-testid={`download-${item.beat_id}`}
                        >
                          <Download className="w-4 h-4" strokeWidth={1.5} />
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Purchases;
```

---

## 🔒 6. Segurança

### Medidas de Segurança Implementadas

✅ **Tokens JWT temporários** (30 minutos)
✅ **Validação de propriedade** (usuário x pedido)
✅ **Limite de downloads** (3 por item)
✅ **Registro de IP e User-Agent**
✅ **Files paths validados** (sem directory traversal)
✅ **Status do pedido verificado** (PAID)

---

## 🧪 7. Testes

### 7.1 Testar Fluxo Completo

```bash
# 1. Criar pedido
# 2. Simular pagamento (webhook)
# 3. Acessar /purchases
# 4. Clicar em Download
# 5. Verificar arquivo baixado
```

### 7.2 Testar Limites

1. Baixar o mesmo arquivo 3 vezes
2. Tentar baixar a 4ª vez
3. Deve retornar erro: "Limite atingido"

### 7.3 Testar Token Expirado

```python
# Gerar token com expiração de 1 segundo
# Aguardar 2 segundos
# Tentar usar o token
# Deve retornar 401
```

---

## ✅ Checklist

- [ ] Modelo Download criado
- [ ] Serviço de downloads implementado
- [ ] Rotas de download adicionadas
- [ ] Estrutura de pastas criada
- [ ] Frontend de compras completo
- [ ] Testes de segurança realizados
- [ ] Limites de download funcionando
- [ ] Logs configurados
- [ ] Webhook atualizando status

---

**Próximo guia**: [Dashboard do Usuário](./USER_DASHBOARD.md)
