# 🚀 Guia de Deploy - BarberMaster na Vercel

## ✅ Status Atual

- ✅ Código commitado e enviado para: `https://github.com/gpimentat/barbermaster-app.git`
- ✅ Branch: `main`
- ✅ Último commit: `1c09458 - Initial commit: BarberMaster funcional e pronto para deploy`

---

## 📋 Passo a Passo para Deploy na Vercel

### 1️⃣ Acessar a Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta GitHub

### 2️⃣ Importar o Projeto

1. Clique em **"Add New..."** → **"Project"**
2. Selecione o repositório: **`gpimentat/barbermaster-app`**
3. Clique em **"Import"**

### 3️⃣ Configurar o Projeto

Na tela de configuração:

#### **Framework Preset**
- Selecione: **Vite**

#### **Root Directory**
- Deixe como: **`./`** (raiz do projeto)

#### **Build Settings** (já deve estar preenchido automaticamente)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4️⃣ Configurar Variáveis de Ambiente

> [!IMPORTANT]
> **CRÍTICO**: Você DEVE adicionar as variáveis de ambiente do Supabase!

Clique em **"Environment Variables"** e adicione:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://aogsaxrduljhmrdajvlo.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvZ3NheHJkdWxqaG1yZGFqdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NDU2NDMsImV4cCI6MjA4MjAyMTY0M30.fQGEGSLG4U2iLuAmNHNJzyO9zrqJBtfxP8piMVX8AKs` |

**Importante**: Aplique essas variáveis para todos os ambientes (Production, Preview, Development)

### 5️⃣ Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (geralmente leva 1-2 minutos)
3. ✅ Pronto! Seu app estará no ar!

---

## 🌐 Após o Deploy

### Acessar o App
Após o deploy, a Vercel fornecerá:
- **URL de Produção**: `https://barbermaster-app.vercel.app` (ou similar)
- **URLs de Preview**: Para cada branch/PR

### Configurar Domínio Personalizado (Opcional)
1. Vá em **Settings** → **Domains**
2. Adicione seu domínio personalizado
3. Configure os DNS conforme instruções da Vercel

---

## 🔧 Configurações Importantes da Vercel

### Redirects e Rewrites (SPA)
A Vercel já configura automaticamente para SPAs Vite, mas se necessário, você pode adicionar um arquivo `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### Variáveis de Ambiente
- Sempre que atualizar as variáveis de ambiente na Vercel, você precisará fazer um **redeploy**
- Vá em **Deployments** → selecione o último deploy → **"Redeploy"**

---

## 🔄 Deploys Automáticos

A partir de agora, **TODA vez** que você fizer push para o GitHub:

```bash
git add .
git commit -m "Sua mensagem"
git push origin main
```

A Vercel automaticamente:
1. Detecta o push
2. Faz o build
3. Faz o deploy
4. Atualiza o site em produção

---

## 🐛 Troubleshooting

### Build Falhou?
1. Verifique os logs na Vercel
2. Certifique-se que as variáveis de ambiente estão configuradas
3. Teste localmente: `npm run build`

### App não carrega?
1. Verifique o console do navegador (F12)
2. Confirme que as variáveis de ambiente estão corretas
3. Verifique se o Supabase está acessível

### Erro 404 em rotas?
- A Vercel deve configurar automaticamente, mas se necessário, adicione o `vercel.json` mencionado acima

---

## 📞 Suporte

- **Documentação Vercel**: https://vercel.com/docs
- **Suporte Vercel**: https://vercel.com/support
- **Documentação Vite**: https://vitejs.dev/guide/

---

## ✨ Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Teste todas as funcionalidades principais
2. ✅ Configure um domínio personalizado (se desejar)
3. ✅ Configure Analytics da Vercel (opcional)
4. ✅ Configure alertas de erro (Sentry, etc.)
5. ✅ Adicione monitoramento de performance

---

**Boa sorte com o deploy! 🚀**
