# AcheDoações — integração com Google Maps

O código já integra a **Maps JavaScript API** do Google para a listagem de pontos, página de detalhes e seleção de coordenadas nos formulários. Sem uma chave configurada, o projeto preserva o mapa **OpenStreetMap/Leaflet**. Se o carregamento do script Google falhar, o mapa alternativo é usado.

## Ativação no Google Cloud

1. Abra https://console.cloud.google.com/ e selecione/crie um projeto.
2. Vincule uma conta de faturamento ao projeto e habilite **Maps JavaScript API** em APIs e serviços. O Google pode cobrar conforme o uso.
3. Em **Google Maps Platform > Map Management**, crie um **Map ID** do tipo **JavaScript**.
4. Em **APIs e serviços > Credenciais**, crie uma **API key**.
5. **Restrinja a chave** por **Websites (HTTP referrers)**, com o domínio da Vercel e seu domínio personalizado (ex.: `https://seu-projeto.vercel.app/*`; se necessário, configure localhost para testes), e por **API restrictions > Maps JavaScript API**. Não conceda acesso genérico a outras APIs.
6. Na Vercel, abra **Project > Settings > Environment Variables**. Cadastre:
   - `VITE_GOOGLE_MAPS_API_KEY` — a API key restrita para navegadores.
   - `VITE_GOOGLE_MAPS_MAP_ID` — o Map ID criado.
7. Faça **Redeploy** para que o Vite incorpore essas variáveis no build.

Para uso local, copie `frontend/.env.example` para `frontend/.env.local`, preencha os valores e reinicie `npm run dev`.

**Segurança:** valores `VITE_*` são incluídos no JavaScript que o navegador recebe. Não coloque credenciais privadas, tokens de serviço ou chaves sem restrições nessas variáveis. É obrigatório restringir a chave HTTP referrer e à API específica e monitorar cotas/custos.

## Funcionalidades implementadas

- Google Maps e marcadores interativos usando Advanced Markers.
- Popup de detalhes de um ponto e seleção sincronizada com a lista.
- Centralização ao selecionar um ponto, na localização compartilhada pelo visitante ou no conjunto de pontos.
- Clique no mapa para preencher latitude e longitude nos formulários que já usam `onPick`.
- Botão de rotas existente abre Google Maps para **pontos reais verificados**.
- Fallback OpenStreetMap para falta de chave ou falha no carregamento do script.

A API do Google Maps **não substitui o backend Express nem o banco de dados**. Para login, cadastros e listagem real, a Vercel ainda precisa ter `API_PROXY_ORIGIN` apontando para um backend persistente.

**Atenção:** os pontos fictícios do projeto continuam fictícios. Não use coordenadas de demonstração como endereços oficiais para doações.
