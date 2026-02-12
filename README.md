# 🎵 OMINSOUNDS - Marketplace Premium de Beats

> Marketplace brasileiro inspirado em BeatStars e Beatplace, conectando produtores e artistas.

![OMINSOUNDS](https://images.unsplash.com/photo-1742163512400-7af30b2d17cc?q=85&w=1200)

## 🌟 Visão Geral

OMINSOUNDS é um marketplace completo para compra e venda de beats profissionais, desenvolvido com as tecnologias mais modernas do mercado.

### ✨ Características Principais

- 🎨 **Design Premium**: Interface elegante inspirada em Apple Music com tema "Obsidian Studio"
- 🎵 **Player Global**: Reprodutor de áudio fixo com controles completos
- 🔍 **Busca Avançada**: Filtros por gênero, BPM, tonalidade e preço
- 👤 **Multi-Role**: Sistema de usuários (USER, PRODUCER, ADMIN)
- 💳 **E-commerce Completo**: Carrinho, checkout e gestão de pedidos
- 📊 **Analytics**: Dashboard com estatísticas de vendas para produtores
- 🎤 **Upload Profissional**: Sistema completo de upload de beats com metadados

## 🛠️ Stack Tecnológica

### Backend
- **FastAPI** - Framework Python async de alta performance
- **MongoDB** - Banco de dados NoSQL com Motor (async driver)
- **JWT** - Autenticação segura com tokens
- **Python 3.11+** - Linguagem base

### Frontend
- **React 19** - Biblioteca UI moderna
- **Zustand** - Gerenciamento de estado global
- **TailwindCSS** - Framework CSS utility-first
- **Shadcn/UI** - Componentes UI premium
- **React Router** - Navegação SPA
- **Axios** - Cliente HTTP
- **WaveSurfer.js** - Visualização de áudio
- **Sonner** - Notificações toast elegantes

## 📁 Estrutura do Projeto

```
ominsounds/
├── backend/
│   ├── server.py          # Aplicação FastAPI principal
│   ├── models.py          # Modelos Pydantic
│   ├── auth.py            # Autenticação JWT
│   ├── requirements.txt   # Dependências Python
│   ├── uploads/           # Arquivos enviados
│   │   ├── audio/        # Arquivos de áudio
│   │   └── images/       # Imagens de capa
│   └── .env              # Variáveis de ambiente
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   │   ├── layout/  # Navbar, Footer
│   │   │   └── ui/      # Shadcn components
│   │   ├── pages/       # Páginas da aplicação
│   │   │   ├── producer/ # Área do produtor
│   │   │   ├── Home.jsx
│   │   │   ├── Explore.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Cart.jsx
│   │   ├── store/       # Zustand stores
│   │   ├── services/    # APIs e integrações
│   │   ├── App.js       # Componente raiz
│   │   └── index.css    # Estilos globais
│   ├── package.json
│   └── .env
├── docs/                 # Documentação
└── README.md            # Este arquivo
```

## 🚀 Instalação e Configuração

Veja o arquivo [SETUP.md](./docs/SETUP.md) para instruções detalhadas de como configurar o ambiente de desenvolvimento.

## 📖 Documentação

### 🚀 Começando
- **[Setup e Configuração](./docs/SETUP.md)** - Como configurar e rodar o projeto no VSCode
- **[Script de Apresentação](./docs/PRESENTATION.md)** - Roteiro completo para demos e pitches

### 💻 Implementação
- **[Integração Asaas](./docs/ASAAS_INTEGRATION.md)** - Checkout e pagamentos (Pix, Boleto, Cartão)
- **[Página de Detalhes do Beat](./docs/BEAT_DETAILS_PAGE.md)** - Beat page com waveform interativa
- **[Perfil Público do Produtor](./docs/PRODUCER_PROFILE.md)** - Página de perfil rica e envolvente
- **[Sistema de Downloads](./docs/DOWNLOAD_SYSTEM.md)** - Downloads seguros pós-pagamento
- **[Dashboard do Usuário](./docs/USER_DASHBOARD.md)** - Área completa do usuário (compras, favoritos, configurações)

## 🎯 Roadmap

### ✅ Fase 1 - MVP (Concluído)
- [x] Autenticação e autorização
- [x] Sistema de beats (CRUD)
- [x] Upload de arquivos
- [x] Player global
- [x] Carrinho de compras
- [x] Dashboard do produtor
- [x] Exploração com filtros

### 🚧 Fase 2 - E-commerce
- [ ] Integração Asaas (checkout)
- [ ] Sistema de downloads
- [ ] Página de detalhes do beat
- [ ] Perfil público do produtor
- [ ] Dashboard do usuário

### 🔮 Fase 3 - Engajamento
- [ ] Sistema de avaliações
- [ ] Comentários nos beats
- [ ] Playlists personalizadas
- [ ] Sistema de seguir produtores
- [ ] Notificações

### 🎨 Fase 4 - SaaS Evolution
- [ ] Planos de assinatura
- [ ] Analytics avançado
- [ ] API pública
- [ ] White-label

## 🎨 Design System

### Cores
- **Background**: `#050505` (Preto obsidiana)
- **Primary**: `#7C3AED` (Roxo vibrante)
- **Accent**: `#06B6D4` (Ciano)
- **Card**: `#0A0A0A` (Preto card)
- **Muted**: `#A1A1AA` (Cinza)

### Tipografia
- **Headings**: Manrope (bold, tracking-tight)
- **Body**: Plus Jakarta Sans
- **Mono**: JetBrains Mono (dados técnicos)

### Componentes
- Glass morphism com backdrop-blur
- Bordas sutis (white/5 ou white/10)
- Botões rounded-full
- Neon glows em elementos ativos

## 🔐 Autenticação

### Tipos de Conta
1. **USER** - Comprador/Artista
   - Explorar beats
   - Comprar licenças
   - Gerenciar favoritos
   - Visualizar compras

2. **PRODUCER** - Produtor
   - Todas as permissões de USER
   - Upload de beats
   - Dashboard de vendas
   - Analytics
   - Gerenciar beats

3. **ADMIN** - Administrador
   - Todas as permissões

## 📊 API Endpoints

### Autenticação
```
POST /api/auth/register  - Criar conta
POST /api/auth/login     - Login
GET  /api/auth/me        - Dados do usuário atual
```

### Beats
```
GET    /api/beats           - Listar beats (com filtros)
GET    /api/beats/{id}      - Detalhes do beat
POST   /api/beats           - Criar beat (Producer)
PUT    /api/beats/{id}      - Atualizar beat (Producer)
DELETE /api/beats/{id}      - Deletar beat (Producer)
```

### Favoritos
```
GET    /api/favorites       - Listar favoritos
POST   /api/favorites/{id}  - Adicionar favorito
DELETE /api/favorites/{id}  - Remover favorito
```

### Pedidos
```
GET  /api/orders        - Listar pedidos
GET  /api/orders/{id}   - Detalhes do pedido
POST /api/orders        - Criar pedido
```

### Produtor
```
GET /api/producer/stats      - Estatísticas
GET /api/producer/beats      - Beats do produtor
GET /api/producers/{id}      - Perfil público
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 👥 Autores

- **OMINSOUNDS Team** - *Trabalho Inicial*

## 🙏 Agradecimentos

- Design inspirado em BeatStars e Beatplace
- Comunidade React e FastAPI
- Todos os produtores e artistas brasileiros

---

**OMINSOUNDS** - Conectando Beats e Artistas 🎵
