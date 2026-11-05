> Para a configuração atual com API na própria Vercel, siga [GUIA-VERCEL-COMPLETO.md](GUIA-VERCEL-COMPLETO.md). O fluxo de proxy abaixo descreve a configuração anterior.

# AcheDoações — enviar para GitHub e publicar

## 1. Enviar os arquivos ao GitHub

**Importante:** o GitHub guarda o código, mas não executa o banco de dados e o servidor automaticamente. Arquivos `.env`, bancos e `node_modules` não devem ser enviados.

1. Descompacte o ZIP. Abra no VS Code a pasta **`achedoacoes`**, que contém `package.json`, `frontend/` e `backend/`.
2. No GitHub, clique **New repository**, digite `achedoacoes`, crie um repositório **vazio** (sem adicionar README ou .gitignore pela interface).
3. No terminal do VS Code, dentro dessa pasta, execute, substituindo SEU_USUARIO:

```bash
git init
git add .
git commit -m "Projeto AcheDoações preparado para publicação"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/achedoacoes.git
git push -u origin main
```

Se `git` não for reconhecido, instale o Git para Windows e reabra o terminal. O GitHub pode pedir autenticação via navegador/token. Se preferir, use **Add file → Upload files** no repositório vazio, **enviando o conteúdo interno da pasta** `achedoacoes` (incluindo pastas ocultas, especialmente `.github`) em vez do ZIP inteiro.

Se o terminal reclamar que o repositório remoto já existe, confira `git remote -v` antes de alterar a origem.

## 2. Executar e conferir localmente

Instale Node.js 22 (22.12 ou superior) e rode na raiz:

```bash
npm ci
npm run setup
npm run dev
```

Abra http://localhost:5173. A aplicação exige backend + SQLite, então **não funciona** apenas abrindo `index.html`.

Para conferir os testes e o build:

```bash
npm test
npm run build
```

A automação `.github/workflows/ci.yml` verifica instalação, testes e compilação nos pushes ao GitHub. **Não é hospedagem**.

## 3. Publicar o site completo (recomendado: Render)

Como o banco original é SQLite, para manter cadastros, favoritos e sessões é necessário **disco persistente**. A opção pronta neste repositório é `render.yaml`:

1. Acesse https://dashboard.render.com/ e conecte sua conta do GitHub.
2. Escolha **New → Blueprint**, selecione o repositório e confirme as configurações de `render.yaml`.
3. O blueprint usa o plano **Starter com disco de 1 GB (pago)**. Confira os preços antes de confirmar. Hospedagem gratuita/sem disco **não preserva dados**.
4. A Render configura automaticamente `RENDER_EXTERNAL_URL`; o backend usa essa origem HTTPS para validar operações. `DATABASE_URL=file:/var/data/achedoacoes.db` aponta para o disco persistente.
5. O comando inicial aplica as migrations antes de iniciar o servidor. **Não roda seed de contas de teste em produção**.
6. Abra a URL fornecida pela Render. O React e a API funcionarão juntos no **mesmo endereço**, sem necessidade de Vercel.

**Crie o primeiro administrador em produção:** cadastre uma conta normal no site; depois, no **Shell privado do serviço Render**, dentro da raiz do projeto, execute:

```bash
npm run admin:promote -w backend -- seu-email@exemplo.com
```

Esse comando exige acesso ao terminal do servidor. Não há formulário público de criação de administrador. No painel admin, valide as instituições e pontos publicados. **Não execute o seed demonstrativo em produção.**

## 4. Opcional: frontend na Vercel + backend na Render

A Vercel pode hospedar o **frontend React**, mas o banco SQLite e a API precisam continuar em um servidor com persistência (por exemplo, a Render acima). O arquivo `vercel.mjs` da raiz foi incluído para configurar o proxy sem expor cookies a chamadas cross-site do frontend.

1. Primeiro publique o backend na Render e guarde a URL HTTPS (por exemplo `https://achedoacoes.onrender.com`).
2. Na Vercel, selecione **Add New → Project → Import Git Repository**, escolha este repositório.
3. Mantenha **Root Directory = `./` (raiz)**. O arquivo `vercel.mjs` instala workspaces, compila somente `frontend` e publica `frontend/dist`.
4. Em **Environment Variables**, adicione `API_PROXY_ORIGIN` com **a URL pública do serviço Render**, sem barra final e sem `/api`.
5. Faça o deploy e copie o domínio final da Vercel (`https://...vercel.app`).
6. No painel Render, crie `APP_ORIGINS` com a **URL exata do frontend da Vercel**, sem barra final. Salve as alterações e reinicie/reimplante o serviço se necessário.
7. Verifique `https://seu-projeto.vercel.app/api/health` e teste login/cadastro. As requisições a `/api` serão encaminhadas para a Render; o usuário permanece na origem da Vercel.

**Atenção:** se `API_PROXY_ORIGIN` não for configurada, o build Vercel falha com uma mensagem explicativa em vez de publicar um site com funcionalidades quebradas. Pré-visualizações da Vercel usam domínios diferentes e também precisariam ser listadas em `APP_ORIGINS`; não use autorização por coringa. Mantenha o frontend e o backend em HTTPS. Não use a Vercel isoladamente como hospedeira desse SQLite local.

### Se aparecer um erro

- **404 ao atualizar a página:** confira `vercel.mjs`, que inclui fallback SPA para `index.html`.
- **/api retorna HTML em vez de JSON:** confira `API_PROXY_ORIGIN` e se o proxy foi incluído antes do fallback SPA.
- **403 Origem não permitida:** cadastre a URL HTTPS exata da Vercel em `APP_ORIGINS` na Render.
- **Login não persiste:** verifique HTTPS, proxy de `/api`, `Set-Cookie` e configuração do navegador.
- **Erro de banco:** confirme o disco permanente e o valor de `DATABASE_URL`. Bancos SQLite não podem ser usados com armazenamento efêmero em produção.

## Observações de segurança

Os 12 locais e as contas do seed são **fictícios e locais**. Não publique o banco de desenvolvimento nem credenciais reais. Antes de cadastrar pontos verdadeiros, confirme consentimentos, contatos, privacidade, backups, política de uso dos mapas e validação administrativa.
