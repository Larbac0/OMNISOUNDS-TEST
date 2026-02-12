# 🛠️ Configuração e Setup do OMINSOUNDS

> Guia completo para configurar o ambiente de desenvolvimento no VSCode

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** 18+ e **Yarn** (frontend)
- **Python** 3.11+ e **pip** (backend)
- **MongoDB** 5.0+ (banco de dados)
- **VSCode** (editor recomendado)
- **Git** (controle de versão)

### Extensões VSCode Recomendadas

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "mongodb.mongodb-vscode"
  ]
}
```

## 🚀 Instalação Rápida

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/ominsounds.git
cd ominsounds
```

### 2. Configure o Backend

```bash
# Entre na pasta do backend
cd backend

# Crie um ambiente virtual Python
python -m venv venv

# Ative o ambiente virtual
# No Linux/Mac:
source venv/bin/activate
# No Windows:
venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
```

**Edite o arquivo `.env`:**

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=ominsounds
CORS_ORIGINS=http://localhost:3000
JWT_SECRET_KEY=seu-secret-key-super-seguro-mude-em-producao
```

### 3. Configure o Frontend

```bash
# Volte para a raiz e entre no frontend
cd ../frontend

# Instale as dependências
yarn install

# Configure as variáveis de ambiente
cp .env.example .env
```

**Edite o arquivo `.env`:**

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4. Inicie o MongoDB

```bash
# Se instalado via brew (Mac):
brew services start mongodb-community

# Se instalado via apt (Linux):
sudo systemctl start mongod

# Ou via Docker:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Execute a Aplicação

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate  # ou venv\Scripts\activate no Windows
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

O backend estará disponível em: `http://localhost:8001`

**Terminal 2 - Frontend:**

```bash
cd frontend
yarn start
```

O frontend estará disponível em: `http://localhost:3000`

## 🎯 VSCode - Configuração Ideal

### 1. Workspace Settings

Crie o arquivo `.vscode/settings.json` na raiz do projeto:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true
  },
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/node_modules": true
  }
}
```

### 2. Launch Configuration

Crie o arquivo `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "server:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8001"
      ],
      "jinja": true,
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/backend"
      }
    },
    {
      "name": "Chrome: React",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["Python: FastAPI", "Chrome: React"],
      "stopAll": true
    }
  ]
}
```

### 3. Tasks (Automação)

Crie o arquivo `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Backend",
      "type": "shell",
      "command": "source venv/bin/activate && uvicorn server:app --reload --host 0.0.0.0 --port 8001",
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Start Frontend",
      "type": "shell",
      "command": "yarn start",
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Start MongoDB",
      "type": "shell",
      "command": "brew services start mongodb-community",
      "problemMatcher": []
    },
    {
      "label": "Install Backend Dependencies",
      "type": "shell",
      "command": "pip install -r requirements.txt",
      "options": {
        "cwd": "${workspaceFolder}/backend"
      }
    },
    {
      "label": "Install Frontend Dependencies",
      "type": "shell",
      "command": "yarn install",
      "options": {
        "cwd": "${workspaceFolder}/frontend"
      }
    }
  ]
}
```

## 🐛 Debug no VSCode

### Debug Backend (FastAPI)

1. Coloque breakpoints no código Python
2. Pressione `F5` ou vá em **Run > Start Debugging**
3. Selecione **"Python: FastAPI"**
4. O servidor iniciará em modo debug
5. Faça requisições da aplicação para ativar os breakpoints

### Debug Frontend (React)

1. Inicie o frontend normalmente: `yarn start`
2. No VSCode, pressione `F5`
3. Selecione **"Chrome: React"**
4. O Chrome abrirá conectado ao debugger
5. Coloque breakpoints nos arquivos `.js/.jsx`

### Debug Full Stack

1. Pressione `F5`
2. Selecione **"Full Stack"**
3. Ambos backend e frontend iniciarão em modo debug

## 📦 Estrutura de Pastas Detalhada

```
ominsounds/
├── .vscode/              # Configurações do VSCode
│   ├── settings.json
│   ├── launch.json
│   └── tasks.json
├── backend/
│   ├── venv/            # Ambiente virtual Python
│   ├── uploads/         # Arquivos enviados
│   │   ├── audio/
│   │   └── images/
│   ├── server.py        # App FastAPI
│   ├── models.py        # Modelos Pydantic
│   ├── auth.py          # JWT Auth
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── Footer.jsx
│   │   │   ├── ui/      # Shadcn components
│   │   │   ├── BeatCard.jsx
│   │   │   └── GlobalPlayer.jsx
│   │   ├── pages/
│   │   │   ├── producer/
│   │   │   │   ├── ProducerDashboard.jsx
│   │   │   │   └── UploadBeat.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Explore.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Cart.jsx
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   ├── playerStore.js
│   │   │   └── cartStore.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── .env
├── docs/                # Documentação
└── README.md
```

## 🧪 Testando a Instalação

### 1. Teste o Backend

```bash
# Health check
curl http://localhost:8001/api/beats

# Deve retornar: []
```

### 2. Teste o Frontend

Abra o navegador em `http://localhost:3000`

Você deve ver:
- ✅ Página home com hero section
- ✅ Navbar com logo OMINSOUNDS
- ✅ Botões de Login e Registrar
- ✅ Seção de estatísticas

### 3. Teste o Fluxo Completo

1. **Registro**: Crie uma conta de produtor
2. **Login**: Faça login com as credenciais
3. **Upload**: Faça upload de um beat de teste
4. **Explorar**: Veja o beat na página de exploração
5. **Player**: Clique para reproduzir o beat
6. **Carrinho**: Adicione ao carrinho

## 🔧 Solução de Problemas

### Backend não inicia

```bash
# Verifique se o MongoDB está rodando
mongosh

# Verifique as dependências
pip list | grep fastapi

# Verifique os logs
tail -f /var/log/supervisor/backend.err.log
```

### Frontend não compila

```bash
# Limpe o cache
rm -rf node_modules
yarn cache clean
yarn install

# Verifique a versão do Node
node --version  # Deve ser 18+
```

### Erro de CORS

Verifique se `CORS_ORIGINS` no backend `.env` inclui a URL do frontend:

```env
CORS_ORIGINS=http://localhost:3000
```

### MongoDB Connection Error

```bash
# Verifique se está rodando
sudo systemctl status mongod

# Ou via Docker
docker ps | grep mongo

# Teste a conexão
mongosh mongodb://localhost:27017
```

## 📊 Monitoramento

### Logs do Backend

```bash
# Em desenvolvimento (terminal com uvicorn --reload)
# Os logs aparecem no terminal

# Logs detalhados
tail -f /var/log/supervisor/backend.out.log
```

### Logs do Frontend

```bash
# Console do navegador (F12)
# Ou terminal onde rodou yarn start
```

### MongoDB Logs

```bash
# Mac/Linux
tail -f /usr/local/var/log/mongodb/mongo.log

# Docker
docker logs -f mongodb
```

## 🎓 Próximos Passos

1. ✅ Ambiente configurado
2. 📖 Leia a [Apresentação do Projeto](./PRESENTATION.md)
3. 💳 Configure [Integração Asaas](./ASAAS_INTEGRATION.md)
4. 🚀 Implemente os [Next Action Items](./BEAT_DETAILS_PAGE.md)

## 💡 Dicas de Produtividade

### Snippets Úteis

Crie o arquivo `.vscode/ominsounds.code-snippets`:

```json
{
  "React Component": {
    "prefix": "rfc",
    "body": [
      "import React from 'react';",
      "",
      "const ${1:ComponentName} = () => {",
      "  return (",
      "    <div data-testid='${1/(.*)/${1:/downcase}/}'>$0</div>",
      "  );",
      "};",
      "",
      "export default ${1:ComponentName};"
    ]
  },
  "FastAPI Route": {
    "prefix": "fapi",
    "body": [
      "@api_router.${1|get,post,put,delete|}('${2:/endpoint}')",
      "async def ${3:function_name}():",
      "    \"\"\"${4:Description}\"\"\" ",
      "    $0",
      "    return {'message': 'Success'}"
    ]
  }
}
```

### Atalhos Recomendados

- `Ctrl+Shift+P`: Command Palette
- `Ctrl+P`: Quick Open File
- `Ctrl+```: Toggle Terminal
- `F5`: Start Debugging
- `Ctrl+Shift+F`: Find in Files
- `Alt+Shift+F`: Format Document

---

**Pronto!** 🎉 Seu ambiente está configurado. Agora é só codar!
