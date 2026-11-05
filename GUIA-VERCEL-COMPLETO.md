# AcheDoações completo na Vercel

A configuração anterior publicava somente o frontend e dependia de um backend Render em `API_PROXY_ORIGIN`. Agora o projeto contém uma função Express em `api/index.ts`, servida em `/api`, junto do frontend. O banco na Vercel deve ser PostgreSQL persistente. SQLite continua disponível para desenvolvimento local ou Render com disco persistente.

## Ativação em produção

1. No projeto Vercel `achedoa-oes`, use a raiz do repositório (Root Directory vazio), instalação `npm ci`, build `npm run build:vercel` e saída `frontend/dist`. O arquivo `vercel.mjs` já define esses comandos. Remova qualquer override antigo de build apenas do frontend.
2. Conecte um banco PostgreSQL do Marketplace (por exemplo Neon) ao projeto. Configure `DATABASE_URL` com a conexão fornecida pelo banco. Nunca use `file:`, armazenamento `/tmp` ou uma URL fictícia em produção. Preview deve ter banco próprio; não compartilhe o banco de produção com branches não revisadas.
3. Configure `APP_ORIGIN=https://achedoa-oes.vercel.app`. Domínios adicionais entram em `APP_ORIGINS`, separados por vírgulas. URLs automáticas de deployment da Vercel também são reconhecidas. `API_PROXY_ORIGIN` não é mais necessário.
4. Em um terminal autorizado, com a conexão do banco no ambiente, execute `npm run db:deploy:vercel`. Isso aplica migrações PostgreSQL e cadastra somente as oito categorias de roupas. O build não modifica dados nem executa migrações automaticamente. Use a conexão direta do provedor para migrações se o pool não suportar DDL; a aplicação pode usar a conexão agrupada.
5. Faça o deploy e verifique `/api/health`: deve responder JSON `{"status":"ok"}`. `/api/categories` deve retornar oito categorias. Teste cadastro, login, logout e atualização da página.
6. Cadastre sua conta real no site e execute no terminal autorizado `npm run admin:promote -w backend -- seu-email`. Não há administrador com senha padrão em produção.
7. Cadastre instituições e pontos reais com fonte oficial. Aprove instituições e pontos na administração. Sem registros aprovados, uma busca vazia é correta, mesmo com a API saudável.

## Mapas e APIs

- Autenticação, sessões, categorias, instituições, pontos, campanhas, favoritos, avaliações, denúncias e administração usam as APIs próprias do projeto e PostgreSQL.
- OpenStreetMap/Leaflet funciona sem chave Google; geolocalização depende da permissão do navegador e HTTPS. Rotas abrem no Google Maps por link, sem chave.
- Google Maps JavaScript é opcional: configure `VITE_GOOGLE_MAPS_API_KEY` e habilite a API em sua conta Google Cloud, com restrições de domínio. Sem chave ou em caso de falha, o site usa OpenStreetMap. Google Maps não fornece automaticamente um catálogo verificado de pontos de doação.
- Não é necessário contratar API de e-mail/SMS para os fluxos atuais: o projeto não oferece recuperação de senha ou notificações por esses canais.

## Temas

O botão no cabeçalho alterna modo claro e escuro, inclusive no celular. A primeira visita respeita o tema do dispositivo; a escolha fica salva no navegador e é aplicada antes de desenhar a página.

## Validação

`npm run setup && npm test && npm run build` valida SQLite e o frontend localmente. A CI também sobe PostgreSQL, aplica as migrações, testa as APIs e compila o formato da Vercel. Dados e senhas de demonstração são exclusivos dos testes/desenvolvimento; nunca execute o seed demonstrativo no banco de produção.

Se a função não receber `DATABASE_URL`, retorna HTTP 503 com JSON explícito. Isso é um diagnóstico, não uma substituição da conexão: o site só fica operacional após conectar e inicializar o banco.
