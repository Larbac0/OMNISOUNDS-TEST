# ⚡ Referência Rápida - OMINSOUNDS

> Comandos e informações essenciais para desenvolvimento rápido

---

## 🚀 Comandos Essenciais

### Iniciar Projeto

```bash
# Terminal 1 - Backend
cd /app/backend
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 - Frontend
cd /app/frontend
yarn start
```

### Instalar Dependências

```bash
# Backend
cd /app/backend
pip install <package>
pip freeze > requirements.txt

# Frontend
cd /app/frontend
yarn add <package>
```

### Reiniciar Serviços

```bash
# Quando alterar .env ou instalar deps
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Ver status
sudo supervisorctl status
```

---

## 📂 Estrutura de Arquivos

### Criar Nova Página

```bash
# Frontend
/app/frontend/src/pages/MinhaPage.jsx

# Adicionar rota em App.js:
<Route path="/minha-rota" element={<MinhaPage />} />
```

### Criar Nova Rota API

```python
# Backend - server.py
@api_router.get("/api/minha-rota")
async def minha_funcao():
    return {"message": "Sucesso"}
```

### Adicionar Modelo

```python
# Backend - models.py
class MeuModelo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campo: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

---

## 🎨 Design Tokens

### Cores

```css
--background: #050505
--primary: #7C3AED
--accent: #06B6D4
--card: #0A0A0A
--muted: #A1A1AA
```

### Fontes

```css
font-family: 'Manrope'           /* Headings */
font-family: 'Plus Jakarta Sans' /* Body */
font-family: 'JetBrains Mono'    /* Data/Code */
```

### Classes Úteis

```jsx
className="glass"                    // Glass morphism
className="neon-purple"             // Purple glow
className="rounded-full"            // Pill button
className="rounded-2xl"             // Card corners
className="text-4xl md:text-6xl"   // Responsive heading
```

---

## 🔑 Variáveis de Ambiente

### Backend (.env)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=ominsounds
JWT_SECRET_KEY=seu-secret
ASAAS_API_KEY=sua-chave-asaas
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 🛠️ Componentes Shadcn Disponíveis

```jsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
```

**Localização**: `/app/frontend/src/components/ui/`

---

## 📡 API Calls

### Usar serviço de API

```javascript
import { beatsAPI, authAPI, ordersAPI } from '@/services/api';

// Exemplos
const beats = await beatsAPI.getAll({ genre: 'Trap' });
const beat = await beatsAPI.getById(id);
const response = await authAPI.login({ email, password });
const order = await ordersAPI.create(orderData);
```

### Adicionar novo endpoint

```javascript
// Em /app/frontend/src/services/api.js
export const minhaAPI = {
  getAll: () => api.get('/minha-rota'),
  getById: (id) => api.get(`/minha-rota/${id}`),
  create: (data) => api.post('/minha-rota', data),
};
```

---

## 🗂️ Zustand Stores

### Usar store existente

```javascript
import useAuthStore from '@/store/authStore';
import usePlayerStore from '@/store/playerStore';
import useCartStore from '@/store/cartStore';

// No componente
const { user, isAuthenticated, logout } = useAuthStore();
const { currentBeat, play, pause } = usePlayerStore();
const { items, addItem, removeItem } = useCartStore();
```

### Criar novo store

```javascript
// /app/frontend/src/store/meuStore.js
import { create } from 'zustand';

const useMeuStore = create((set) => ({
  data: null,
  setData: (data) => set({ data }),
  clearData: () => set({ data: null }),
}));

export default useMeuStore;
```

---

## 🧪 Debug & Logs

### Ver logs do backend

```bash
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/backend.err.log
```

### Ver logs do frontend

```bash
tail -f /var/log/supervisor/frontend.out.log
```

### Debug no navegador

```javascript
console.log('Debug:', variavel);

// Ver estado Zustand
console.log(useAuthStore.getState());
```

---

## 🔍 MongoDB Queries

### Via código Python

```python
# Find
beats = await db.beats.find({}, {"_id": 0}).to_list(100)

# Find One
beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})

# Insert
await db.beats.insert_one(beat_dict)

# Update
await db.beats.update_one(
    {"id": beat_id},
    {"$set": {"title": "Novo título"}}
)

# Delete
await db.beats.delete_one({"id": beat_id})
```

### Via terminal (mongosh)

```bash
mongosh
use ominsounds
db.beats.find().pretty()
db.users.countDocuments()
```

---

## 🎯 Testes Rápidos

### Testar endpoint

```bash
# GET
curl http://localhost:8001/api/beats

# POST com JSON
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Com autenticação
curl http://localhost:8001/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Testar frontend

```bash
# Screenshot
# Use mcp_screenshot_tool com Playwright

# Console do navegador (F12)
# Verificar erros e network
```

---

## 🐛 Solução Rápida de Problemas

### Backend não inicia

```bash
# Ver erro
tail -f /var/log/supervisor/backend.err.log

# Reiniciar
sudo supervisorctl restart backend

# Testar manualmente
cd /app/backend
source venv/bin/activate
python server.py
```

### Frontend não compila

```bash
# Limpar cache
rm -rf node_modules
yarn cache clean
yarn install

# Ver erro
tail -f /var/log/supervisor/frontend.err.log
```

### CORS Error

```env
# No backend/.env, adicionar frontend URL
CORS_ORIGINS=http://localhost:3000,https://seu-dominio.com
```

### Mongo Connection Error

```bash
# Verificar se está rodando
sudo systemctl status mongod

# Iniciar
sudo systemctl start mongod

# Testar conexão
mongosh mongodb://localhost:27017
```

---

## 📚 Links Úteis

### Documentação

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Zustand](https://docs.pmnd.rs/zustand)
- [MongoDB Motor](https://motor.readthedocs.io/)

### Design

- [Lucide Icons](https://lucide.dev/)
- [Google Fonts](https://fonts.google.com/)
- [Unsplash](https://unsplash.com/) - Imagens

### Tools

- [ngrok](https://ngrok.com/) - Expor localhost
- [Postman](https://www.postman.com/) - Testar APIs
- [MongoDB Compass](https://www.mongodb.com/products/compass) - GUI para MongoDB

---

## 🎓 Convenções do Projeto

### Nomenclatura

```javascript
// Componentes: PascalCase
BeatCard.jsx
UserDashboard.jsx

// Arquivos: camelCase
authStore.js
playerStore.js

// Rotas API: kebab-case
/api/my-route

// Classes CSS: kebab-case
.beat-card
.glass-effect
```

### Data Test IDs

```jsx
// Sempre adicionar em elementos interativos
<button data-testid="login-button">Login</button>
<div data-testid="beat-card-123">...</div>
```

### Git Commits

```bash
git commit -m "feat: adiciona página de checkout"
git commit -m "fix: corrige erro no player"
git commit -m "docs: atualiza README"
```

---

## 🔥 Atalhos VSCode

```
Ctrl+P         - Quick Open File
Ctrl+Shift+P   - Command Palette
Ctrl+`         - Toggle Terminal
F5             - Start Debugging
Ctrl+Shift+F   - Find in Files
Alt+Shift+F    - Format Document
Ctrl+/         - Toggle Comment
```

---

## 💡 Dicas Pro

1. **Hot Reload funciona!** Não reinicie a cada mudança
2. **Use `view_bulk`** para ver múltiplos arquivos
3. **Componente Shadcn** já estão instalados em `/components/ui/`
4. **Zustand persiste** dados automaticamente (auth, cart)
5. **JWT expira em 7 dias** - use token refresh em produção
6. **Sempre projete `_id`** como `{"_id": 0}` nas queries Mongo
7. **Environment variables** nunca vão pro frontend (exceto REACT_APP_*)

---

**Mantenha este arquivo à mão!** 🎯
