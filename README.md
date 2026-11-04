# AcheDoações

**Quer subir no GitHub e publicar?** Leia [GUIA-GITHUB-VERCEL.md](GUIA-GITHUB-VERCEL.md). O repositório inclui verificação via GitHub Actions, deploy de site completo na Render e opção de frontend na Vercel com API persistente.

Plataforma local de doação de roupas, com frontend React + Vite + TypeScript e backend Express + Prisma + SQLite. Inclui autenticação persistente, revisão administrativa, busca, mapa Leaflet, favoritos, avaliações, denúncias e campanhas.

**Dados iniciais: 12 pontos fictícios. Não utilize os endereços para entregar roupas.** O modo “Pontos reais verificados” começa vazio. Nenhuma instituição real ou parceria é presumida.

## Começar no Windows, macOS ou Linux

1. Instale **Node.js 22.12 ou superior** (recomendado: Node 24 LTS) e npm. O projeto foi compilado com Node 24.22.1.
2. Extraia o ZIP em uma pasta e abra a pasta `achedoacoes` no Visual Studio Code.
3. Abra **Terminal → Novo terminal**, na pasta onde está este README.
4. Execute, um comando por vez:

```bash
npm install
npm run setup
npm run dev
```

5. Abra **http://localhost:5173**. A API estará em **http://localhost:3001/api**.
6. Mantenha o terminal aberto. Para parar, pressione `Ctrl+C`.

`npm run setup` copia `backend/.env.example` para `backend/.env` se ainda não existir, prepara o arquivo SQLite, aplica as migrations, gera o Prisma Client e executa o seed. Não sobrescreve uma configuração existente.

Não abra `index.html` por duplo clique: a aplicação depende dos dois servidores.

### Contas exclusivamente locais

| Papel | E-mail | Senha |
|---|---|---|
| Administrador | admin@demo.local | DemoLocal!2026 |
| Doador | doador@demo.local | DemoLocal!2026 |
| Instituição | instituicao@demo.local | DemoLocal!2026 |

Essas credenciais são públicas e exclusivamente demonstrativas. O seed é bloqueado quando `NODE_ENV=production`. Não leve as contas de demonstração a um ambiente público.

## Configuração

O backend lê `backend/.env`:

```dotenv
DATABASE_URL="file:./dev.db"
PORT=3001
APP_ORIGIN=http://localhost:5173
NODE_ENV=development
```

O caminho do banco é relativo a `backend/prisma`. O arquivo efetivo é `backend/prisma/dev.db`. O frontend utiliza `/api` e o proxy do Vite; não requer segredo nem `.env` próprio. O `.env.example` na raiz é uma referência; o arquivo efetivamente carregado é o do backend.

`APP_ORIGIN` deve corresponder exatamente ao endereço usado no navegador, incluindo porta. Não misture `localhost` e `127.0.0.1`. Se mudar a porta do Vite, atualize a origem. Não habilite CORS irrestrito para contornar o controle de origem.

## Banco, migrations e seed

```bash
npm run db:migrate
npm run db:seed
```

As migrations versionadas criam tabelas, índices, chaves estrangeiras, restrições de unicidade e gatilhos de notas/datas. O seed é idempotente: usa identificadores fixos e não duplica usuários, pontos ou campanhas. Preserva alterações já feitas em pontos; recompõe a aprovação das três campanhas demonstrativas. Não apaga dados de usuários.

O banco persiste após fechar o servidor. Para backup, pare o servidor e copie `backend/prisma/dev.db`. Não distribua um banco com dados pessoais junto ao código. Para experimentar uma base vazia, use outro caminho `DATABASE_URL` e aplique as migrations; não execute seed em produção.

## Fluxo de instituição e aprovação

1. Cadastre uma conta escolhendo **Sou uma instituição**, ou use a conta local da tabela.
2. Acesse **Minha conta → Minha instituição**, preencha nome oficial e descrição. Alterações retornam à revisão.
3. Em **Pontos de coleta → Criar ponto**, preencha endereço, categorias, dias/horários e instruções.
4. Posicione o marcador clicando no mapa ou informe latitude/longitude. Não há geocodificação paga.
5. Para testes, mantenha marcado **local fictício de demonstração**. Para um registro real, desmarque e forneça a fonte oficial.
6. Salve. O ponto fica **Em revisão** e não aparece na consulta pública.
7. Entre como administrador em outro navegador ou saia da sessão atual. Em **Administração**, aprove primeiro a instituição e depois o ponto.
8. Pontos reais exigem URL oficial de verificação e data válida, informadas no ato da aprovação. O administrador deve confirmar também que as coordenadas e o endereço correspondem a um local que recebe doações.
9. Consulte **Pontos de doação** no modo correspondente (demonstração ou real).

Ao editar um ponto, a publicação é suspensa até nova revisão. Campanhas vinculadas também voltam à revisão para manter a classificação real/fictícia consistente. Ao alterar dados institucionais, seus pontos deixam de ser públicos enquanto a instituição aguarda aprovação.

O administrador pode criar pontos em **Pontos de coleta**. Ao abrir sua área institucional pela primeira vez, é criado um cadastro administrativo próprio; ajuste o nome e a descrição em **Minha instituição** para identificar corretamente o responsável. O sistema não declara esse cadastro como instituição real verificada automaticamente.

## Campanhas

Em **Minha conta → Minhas campanhas**, escolha um ponto da própria instituição, informe descrição, itens, instruções e período. A campanha fica pendente. O administrador aprova após aprovar a instituição e o ponto.

O período define “Em breve”, “Em andamento” ou “Encerrada”, combinado com o estado administrativo. **Encerrar** encerra uma campanha sem alterar o conteúdo; não concede aprovação a campanhas pendentes. Editar o conteúdo exige nova aprovação. A opção de encerramento no formulário também retorna o conteúdo para revisão, pois o formulário permite alterações.

## Busca e mapa

- Pesquisa por nome do ponto, instituição, cidade, bairro e rua, feita no SQLite.
- Cidade, bairro e categorias combináveis; todas as categorias selecionadas precisam estar presentes.
- Filtros e página persistidos na URL e compartilháveis.
- Paginação de 12 resultados; somente instituições e pontos aprovados são retornados.
- Dados reais e demonstrativos são consultados em modos separados.
- Lista e marcadores destacam o mesmo ponto; a seleção abre seu popup.
- No celular, alterne **Lista / Mapa**.
- **Perto de mim** solicita localização, calcula Haversine no navegador e ordena todos os resultados filtrados antes de paginar. Não envia nem grava coordenadas do usuário no backend. Para grandes bases, considere um índice geoespacial e uma estratégia de paginação no servidor; nesta versão os registros filtrados são carregados em páginas e ordenados no navegador.
- A lista continua independente dos tiles. Negar localização não impede pesquisa manual.
- Rotas externas são oferecidas somente para pontos reais confirmados. Dados demonstrativos nunca oferecem navegação de entrega.

O mapa precisa de internet e está sujeito à disponibilidade/política de uso do OpenStreetMap. No navegador remoto utilizado na revisão, o provedor exibiu tiles de bloqueio HTTP 403; a lista e os filtros continuaram funcionais. Não houve contorno do bloqueio. Verifique o serviço no ambiente de implantação e dimensione um provedor compatível se houver tráfego relevante.

## Favoritos, avaliações e relatos

Entre como doador, abra um ponto e salve nos favoritos. Eles persistem entre sessões e podem ser removidos em **Minha conta → Pontos favoritos**.

Cada conta pode publicar uma avaliação por ponto, com nota de 1 a 5. Edite ou exclua em **Minhas avaliações**. Uma avaliação denunciada pode ser ocultada pelo administrador; somente o autor altera seu texto.

Relatos de endereço, horário, telefone e outros problemas aparecem no painel administrativo. Tanto relatos quanto denúncias de avaliações exigem login. Não envie dados sensíveis nos comentários.

## Segurança implementada

- Senhas com bcrypt (custo 12); cadastro público não aceita papel ADMIN.
- Sessões SQLite com tokens aleatórios de 256 bits, identificador armazenado como SHA-256, expiração de sete dias e cookie HttpOnly/SameSite=Lax.
- Cookies Secure quando `NODE_ENV=production`.
- Token CSRF vinculado à sessão, exigido no cabeçalho `X-CSRF-Token` em mutações autenticadas; origem conferida quando presente.
- Limite de 20 tentativas de login/cadastro por IP em 15 minutos.
- Validação Zod, limite de corpo JSON, política de cabeçalhos Helmet, renderização de texto por React sem HTML arbitrário.
- Autorização e verificação de propriedade no backend; políticas públicas exigem aprovação.
- Favoritos e avaliações únicos no banco. Chaves estrangeiras e exclusões em cascata mantêm integridade.

Para operação pública, configure HTTPS, backups, contato do responsável e procedimentos de privacidade; remova contas de demonstração e faça revisão de segurança/dependências. Este projeto não contém envio de e-mail, recuperação de senha, upload de imagens, geocodificação automática nem infraestrutura de hospedagem.

## Comandos

| Comando na raiz | Resultado |
|---|---|
| `npm install` | Instala dependências dos dois workspaces |
| `npm run setup` | Configura ambiente, migration e seed |
| `npm run dev` | Inicia frontend e backend |
| `npm run db:migrate` | Aplica migrations e gera Prisma Client |
| `npm run db:seed` | Cria base fictícia e contas locais |
| `npm test` | Testes integrados e validações |
| `npm run build` | Verifica TypeScript e gera os dois builds |
| `npm start` | Serve API e frontend compilado na porta 3001 |

Para rodar o build localmente, execute `npm run build`, ajuste `APP_ORIGIN=http://localhost:3001` no `.env`, mantenha `NODE_ENV=development` para HTTP local e execute `npm start`. Abra http://localhost:3001.

Em produção, `NODE_ENV=production`, origem HTTPS e proxy TLS são necessários para o cookie Secure funcionar. `APP_ORIGINS` permite origens HTTPS adicionais separadas por vírgula (por exemplo, seu domínio Vercel); em serviços Render a variável `RENDER_EXTERNAL_URL` é reconhecida automaticamente. O projeto inclui `render.yaml` e `vercel.mjs`; veja o guia de publicação. O ZIP não publica o site automaticamente.

## API REST

Respostas de erro: `{ "error": "mensagem" }`. Status: 400 validação, 401 sem sessão, 403 permissão/CSRF, 404 inexistente/não publicado, 409 duplicidade, 429 limite, 500 erro interno.

Obtenha `csrf` em `GET /api/auth/me` ou na resposta do login/cadastro. Envie cookie de sessão e `X-CSRF-Token` em POST/PATCH/DELETE autenticados. `PATCH /points/:id` e `PATCH /campaigns/:id` recebem o formulário completo; fechamento isolado de campanha aceita apenas `{ "status": "CLOSED" }`.

| Método e rota (prefixo `/api`) | Permissão / finalidade |
|---|---|
| POST `/auth/register` | Público; name, email, password, role DONOR/INSTITUTION |
| POST `/auth/login` | Público; email, password |
| GET `/auth/me` | Sessão atual e token CSRF |
| POST `/auth/logout` | Autenticado; destrói sessão |
| PATCH `/profile` | Autenticado; altera name |
| GET `/categories` | Público; categorias |
| GET `/points` | Público; q, city, neighborhood, categories (IDs separados por vírgula), mode demo/real, page |
| GET `/points/:id` | Público; ponto aprovado |
| POST `/points` | Instituição/admin; cria ponto pendente |
| PATCH `/points/:id` | Proprietário/admin; revisão após alteração |
| DELETE `/points/:id` | Proprietário/admin; exclui ponto e vínculos |
| GET/PATCH `/institution` | Instituição/admin; dados próprios |
| GET `/manage/points` | Registros próprios; admin vê todos |
| GET `/manage/campaigns` | Campanhas próprias; admin vê todas |
| GET `/campaigns` | Público; mode e page; inclui campanhas aprovadas encerradas |
| GET `/campaigns/:id` | Público; campanha aprovada e ponto público |
| POST `/campaigns` | Instituição/admin; novo conteúdo pendente |
| PATCH `/campaigns/:id` | Proprietário/admin; edição ou fechamento |
| DELETE `/campaigns/:id` | Proprietário/admin |
| GET/POST `/favorites` | Autenticado; POST recebe pointId |
| DELETE `/favorites/:pointId` | Remove favorito próprio |
| GET `/points/:id/reviews` | Público; paginação por page, 12 itens |
| POST `/points/:id/reviews` | Autenticado; rating, comment |
| GET `/reviews/mine` | Avaliações próprias |
| PATCH `/reviews/:id` | Autor; rating, comment |
| DELETE `/reviews/:id` | Autor |
| POST `/points/:id/reports` | Autenticado; reason, description |
| POST `/reviews/:id/reports` | Autenticado; reason |
| GET `/admin/overview` | Admin; indicadores, instituições e relatos |
| PATCH `/admin/institutions/:id` | Admin; status APPROVED/REJECTED |
| PATCH `/admin/points/:id` | Admin; status e, em ponto real, source/verifiedAt |
| PATCH `/admin/campaigns/:id` | Admin; status APPROVED/REJECTED |
| PATCH `/admin/reports/:id` | Admin; status RESOLVED |
| PATCH `/admin/review-reports/:id` | Admin; status HIDDEN/RESOLVED |

Os contratos completos e limites estão em `backend/src/validators.ts`. Exemplo de ponto:

```json
{
  "name": "Ponto fictício de teste",
  "description": "Registro exclusivamente demonstrativo.",
  "state": "SP",
  "city": "São Paulo",
  "neighborhood": "Centro",
  "street": "Endereço ilustrativo — sem entrega",
  "number": "s/n",
  "latitude": -23.55,
  "longitude": -46.63,
  "isDemo": true,
  "categories": ["1", "5"],
  "hours": [{"day":1,"opens":"09:00","closes":"17:00"}]
}
```

Dias: 0 domingo a 6 sábado. Não há suporte a intervalos múltiplos ou virada de dia no mesmo registro de horário. Campos complementares: complement, zip, restrictions, instructions, phone, email, website, source. Verificação administrativa não pode ser autoatribuída pela instituição.

## Testes e verificação

Execute `npm run setup` antes de `npm test`. Os testes usam a base demonstrativa, criam registros temporários e os removem ao finalizar; não execute sobre uma base com dados reais. As requisições percorrem o Express com objetos HTTP simulados, sem abrir sockets.

Foram executados: instalação, migrations em banco novo, seed, compilação TypeScript do frontend e backend, build Vite e 13 testes aprovados (zero falhas). Os testes cobrem autenticação, CSRF, origem, elevação de privilégio, propriedade, publicação após aprovação, filtros, favoritos, avaliações, relatos, moderação e campanhas. A persistência foi verificada lendo o SQLite em outro processo Node.

A página inicial e a busca foram abertas em navegador desktop e em viewport de 390 px, com verificação de menu móvel e alternância lista/mapa. O mapa externo apresentou bloqueio de tiles nesse ambiente; a renderização de marcadores e o acesso textual permanecem separados do provedor. Não foi feito teste em aparelhos Android/iPhone físicos nem auditoria formal de acessibilidade.

## Recursos visuais e fontes

- `frontend/public/images/roupas.svg`: ilustração vetorial original criada para este projeto; pode ser editada e utilizada com o projeto. Esta entrega usa ilustração, não fotografias de terceiros.
- Ícones: Lucide, licença ISC, https://lucide.dev/license.
- Leaflet: licença BSD-2-Clause, https://leafletjs.com.
- OpenStreetMap: atribuição no mapa; dados ODbL, https://www.openstreetmap.org/copyright. Política de tiles: https://operations.osmfoundation.org/policies/tiles/.
- Fontes: Georgia e Arial do sistema; não há carregamento de fontes externas.

Foi consultado o canal oficial do Exército de Salvação como referência para futura verificação: https://www.exercitodoacoes.org.br/doacoes/como-posso-doar e https://www.exercitodesalvacao.org.br/onde-estamos (consulta em 04/11/2026). Nenhum endereço desses canais foi presumido como ponto confirmado ou incluído no seed. A consulta é referência de processo, não parceria.

## Organização

```text
achedoacoes/
  frontend/
    public/images/roupas.svg
    src/App.tsx          páginas públicas e componentes compartilhados
    src/Dashboard.tsx    painéis, formulários e administração
    src/Map.tsx          mapa e seleção de marcadores
    src/api.ts           cliente REST e CSRF
    src/styles.css       tokens, layout e responsividade
  backend/
    prisma/schema.prisma
    prisma/migrations/
    prisma/seed.ts
    src/app.ts           API, sessão e autorização
    src/validators.ts    contratos Zod
    src/db.ts            conexão Prisma
    src/server.ts        inicialização HTTP
    tests/integration.test.ts
  scripts/setup.mjs
  scripts/dev.mjs
  README.md
```

Os arquivos não possuem dependências de serviços pagos. Para evoluir a base, substitua registros fictícios por cadastros reais revisados, mantenha `isDemo` correto e documente fonte/data de confirmação em cada ponto. Não transforme automaticamente os registros de demonstração em instituições reais.
