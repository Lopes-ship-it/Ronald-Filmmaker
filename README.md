# Ronald Filmmaker — Landing Page

Site público + painel administrativo para Ronald Filmmaker: React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router, com **Firebase** (Authentication, Cloud Firestore, Storage e Cloud Functions) como backend exclusivo — nenhum outro banco de dados ou serviço de storage é usado neste projeto. A configuração do Firebase (`firebaseConfig` em `src/lib/firebase.ts`) já vem preenchida com o projeto real — não depende de variáveis de ambiente nem de um arquivo `.env`; é só rodar `npm install && npm run build` em qualquer host, sem passo extra de configuração. O site público funciona com conteúdo mock (`src/data/*`) sempre que o Firestore ainda não tiver nenhum projeto de portfólio cadastrado.

Vídeos enviados pelo painel são comprimidos/otimizados **no servidor**, via Cloud Functions rodando FFmpeg (`functions/` — ver `functions/README.md` para o pipeline completo, custos e o requisito do plano Blaze); a compressão no navegador (ffmpeg.wasm) continua existindo só como fallback automático, para o caso do pipeline do servidor não estar disponível.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. O site funciona imediatamente, com conteúdo mock definido em `src/data/*` — nenhuma variável de ambiente é necessária para desenvolver ou visualizar o site. Os três primeiros projetos do portfólio (Campo Azul, Uma Noite em Branco, Clima de Copa na Loja) usam vídeo e fotos reais, já incluídos em `public/media/portfolio/`; o restante do catálogo usa fotos de placeholder até que mais material real exista.

Outros comandos:

```bash
npm run build     # build de produção em dist/
npm run preview   # serve o build de produção localmente
npm run lint      # oxlint
```

### Publicando em produção

O site agora tem rotas reais (`/`, `/portfolio`, `/portfolio/:slug`), então o host precisa redirecionar qualquer caminho para `index.html` (senão um refresh em `/portfolio/campo-azul` retorna 404). Já incluído no projeto:

- `public/_redirects` — funciona out-of-the-box na Netlify.
- `vercel.json` — funciona out-of-the-box na Vercel.
- `public/.htaccess` — funciona out-of-the-box em hospedagem compartilhada com Apache/cPanel (Hostinger, KingHost, Locaweb, HostGator, GoDaddy, etc).

Não precisa escolher entre eles: os três arquivos convivem no projeto e cada host só lê o que reconhece.

#### Publicando via hospedagem compartilhada (cPanel) com domínio próprio

Esse é o caminho para quem já tem domínio + hospedagem compartilhada paga (o caso mais comum no Brasil):

1. Gere o build de produção (local, com Node instalado): `npm install && npm run build`. Isso cria a pasta `dist/` com o site inteiro já pronto, HTML/CSS/JS estáticos — não precisa de Node rodando no servidor, é hospedagem estática comum. `dist/` fica em torno de **50MB** porque inclui o binário do compactador de vídeo do navegador (`ffmpeg-core-*/`, ~32MB — ver scripts/copy-ffmpeg-core.mjs); confirme que o plano de hospedagem tem espaço/tempo de envio suficiente antes de subir tudo por FTP.
2. No cPanel, abra o **Gerenciador de Arquivos** (ou conecte por FTP/SFTP) e vá até a pasta que o domínio serve. Normalmente é `public_html/` para o domínio principal, ou `public_html/nome-do-subdominio/` para um subdomínio/domínio adicional — confira em **Domínios** dentro do cPanel qual é o "Document Root" do domínio em questão.
3. Envie **o conteúdo de dentro de `dist/`** para essa pasta (o `index.html` deve ficar direto em `public_html/`, não dentro de uma subpasta `dist/`).
4. O arquivo `.htaccess` já vai junto dentro de `dist/` (o Vite copia ele automaticamente de `public/.htaccess`) — só confirme que ele chegou no servidor, porque alguns clientes de FTP escondem arquivos que começam com ponto por padrão. Sem ele, só a home carrega; `/portfolio` e as páginas de projeto dão 404 ao acessar direto pela URL.
5. Ative o certificado SSL grátis do domínio (cPanel → **SSL/TLS Status** → AutoSSL, ou Let's Encrypt, dependendo do provedor) antes de publicar o link — o `.htaccess` já força redirecionamento para HTTPS.
6. Teste depois de publicar: abra a home, depois abra `/portfolio/campo-azul` **direto pela URL** (não clicando dentro do site) e dê um refresh nela. Se aparecer o projeto normalmente em vez de erro 404, o `.htaccess` está funcionando.

Se o domínio for gerenciado em um registrador separado do provedor de hospedagem (ex: domínio no Registro.br apontando para hospedagem em outro lugar), o DNS do domínio (registro tipo A, ou CNAME/nameservers) precisa apontar para o servidor da hospedagem — isso se configura no painel do registrador, não neste projeto.

## Arquitetura

```
src/
  types/            Interfaces TypeScript que espelham o schema do Firestore
  data/              Conteúdo mock (portfólio, categorias, serviços, equipamentos, configurações do site)
  lib/
    content.ts       Camada única de acesso a dados — todo componente lê daqui, nunca de src/data ou do Firestore diretamente
    video.ts         Resolve um VideoSource (upload/YouTube/Vimeo/Instagram) para uma URL/embed reproduzível
    firebase.ts      Clientes Firebase (Auth, Firestore, Storage, Functions) — inativos até as variáveis de ambiente serem definidas
    videoServerProcessing.ts   Orquestração do pipeline server-side: upload do arquivo bruto + acompanhamento do job em videoProcessingJobs/{jobId}
    videoCompression.ts, videoThumbnail.ts, videoUpload.ts   Compressão/thumbnail 100% no navegador (ffmpeg.wasm, arquivos servidos pelo próprio site — ver scripts/copy-ffmpeg-core.mjs) — hoje usado só como fallback automático do pipeline server-side
  context/
    SiteDataContext.tsx  Dados globais (configurações, serviços, processo, equipamentos, categorias) compartilhados entre as páginas roteadas
  components/
    ui/              Componentes reutilizáveis (Button, Carousel, AutoCarousel, VideoPlayer, Accordion, ...)
    portfolio/        ProjectCard — usado na prévia da Home, na página de portfólio e nos relacionados
    admin/             AdminLayout (sidebar + topbar do painel), VideoDropzone (upload + compressão, com fallback automático no navegador)
    ScrollManager.tsx  Faz o scroll até uma âncora (#sobre, #contato, ...) funcionar vindo de qualquer rota
  pages/              Home, PortfolioPage, ProjectPage, NotFound, admin/Login, admin/Dashboard, admin/Projects, admin/ProjectForm
  sections/           Seções de página reaproveitáveis (Hero, About, Services, Portfolio preview, Process, Equipment, Contact)
  App.tsx             Roteador (React Router) + carregamento dos dados globais + code-splitting por rota
functions/              Cloud Functions (Node/TypeScript, projeto separado): compressão/otimização de vídeo com FFmpeg no servidor — ver functions/README.md
scripts/copy-ffmpeg-core.mjs   Copia o binário do ffmpeg.wasm (@ffmpeg/core) de node_modules para public/, para o site self-host-ar (rodado automaticamente por "npm install"/"npm run dev"/"npm run build")
firestore.rules        Regras de segurança do Firestore — toda autorização de escrita é garantida aqui, não pela interface
storage.rules           Regras de segurança do Firebase Storage
firebase.json / .firebaserc   Configuração do Firebase CLI (deploy de rules, hosting e functions)
```

### Como a leitura de dados funciona

Cada função em `src/lib/content.ts` (`getPortfolioProjects`, `getPortfolioProjectBySlug`, `getServices`, etc.) tem assinatura `async` e devolve exatamente o formato de `src/types`. Com o Firebase configurado, todas as funções de leitura pública (portfólio, categorias, serviços, equipamentos, configurações do site) leem sua coleção correspondente no Firestore; se a leitura falhar (offline, sem permissão) ou a coleção ainda estiver vazia, elas caem de volta para o conteúdo mock de `src/data` automaticamente — assim o site nunca fica com uma seção vazia só porque ninguém cadastrou conteúdo real ainda. `processSteps` ("Como um projeto acontece aqui") é a única exceção — continua só mock, já que não faz parte do menu do painel administrativo.

## O módulo de portfólio dinâmico (o que já está pronto)

- **Página de portfólio dedicada** (`/portfolio`): banner que muda conforme a categoria selecionada, filtro por categoria sem recarregar a página (estado local, não é navegação) e grid completo.
- **Página individual por projeto** (`/portfolio/:slug`): vídeo em destaque, cliente, categoria, ano, cidade, tags, equipamento usado, galeria em carrossel e projetos relacionados da mesma categoria.
- **Cards com prévia em vídeo**: passar o mouse sobre um card com vídeo próprio (origem `upload`) troca a foto por uma prévia muda e em loop do vídeo real — é o toque "menos genérico" pedido, sem exigir clique para ver que o projeto tem vídeo.
- **Player multi-origem** (`src/components/ui/VideoPlayer.tsx` + `src/lib/video.ts`): já sabe reproduzir as quatro origens que o painel administrativo vai gerenciar no futuro — arquivo enviado (`upload`), YouTube, Vimeo e Instagram (via embed oficial, com link de fallback se o embed não carregar). Basta o admin salvar `{ origin, url }` no projeto; o player escolhe a estratégia certa sozinho.
- **Categorias como dado, não como código** (`src/data/portfolioCategories.ts`): cada categoria tem slug, descrição e banner próprios, no mesmo formato que a futura tabela `portfolio_categories` do admin.

## Painel administrativo — o que já funciona de verdade

Todas as 12 seções do menu lateral têm uma tela funcional, lendo e gravando direto no Firestore/Storage:

- **Login** (`/admin/login`): Firebase Authentication (e-mail/senha), sem cadastro público — só entra quem foi criado manualmente no Firebase Console. Cada login fica registrado em Registros.
- **Dashboard** (`/admin`): estatísticas do portfólio (total, publicados, em destaque, rascunhos).
- **Portfólio** (`/admin/projetos`): lista com busca, filtro por categoria, publicar/ocultar, destacar, duplicar, excluir (com confirmação) e reordenar.
- **Novo projeto / editar projeto** (`/admin/projetos/novo`, `/admin/projetos/:id`): origem do vídeo (upload — comprimido/otimizado automaticamente no servidor via Cloud Functions + FFmpeg, com fallback automático para compressão no navegador via ffmpeg.wasm se o pipeline do servidor não estiver disponível — ou link do YouTube/Vimeo/Instagram), miniatura automática com opção de regenerar ou enviar uma personalizada, tags, equipamento usado, destaque, publicação e SEO por projeto.
- **Categorias** (`/admin/categorias`): descrição, banner e ordem de cada categoria do portfólio (as categorias em si são um conjunto fixo no código — esta tela edita o conteúdo delas, não cria/exclui categorias novas).
- **Serviços, Equipamentos** (`/admin/servicos`, `/admin/equipamentos`): CRUD completo (criar, editar, excluir, reordenar) através de um único componente reutilizável (`SimpleCollectionAdmin`), já que são coleções pequenas e planas.
- **Contato** (`/admin/contato`) e **Configurações gerais** (`/admin/configuracoes`): editam o documento único `siteSettings` no Firestore — WhatsApp/redes sociais/e-mail, e textos/imagens da seção Sobre, respectivamente.
- **SEO** (`/admin/seo`): meta título, descrição e imagem de compartilhamento globais (cada projeto já pode sobrescrever isso individualmente no formulário de portfólio). `sitemap.xml`/`robots.txt` continuam arquivos estáticos em `public/` — ver nota abaixo.
- **Mídias** (`/admin/midias`): galeria com todos os arquivos no Storage (`portfolio/`), copiar URL e excluir.
- **Relatórios** (`/admin/relatorios`): visualizações de projeto e cliques em WhatsApp/Instagram, contados a partir de eventos anônimos (sem cookies, sem PII) que o próprio site grava no Firestore.
- **Registros** (`/admin/registros`): log de auditoria — toda criação/edição/exclusão/reordenação/login fica registrada com e-mail de quem fez e quando.
- **Perfil** (`/admin/perfil`): troca de senha (reautenticação + `updatePassword` do Firebase Auth).
- **Autorização real, não só de interface**: todo `create`/`update`/`delete`, em qualquer uma dessas telas, é validado pelas regras do Firestore e do Storage (`firestore.rules`, `storage.rules`), exigindo uma sessão Firebase autenticada — esconder um botão na tela nunca é a única proteção.

Duas limitações estruturais, não de escopo — nenhuma quantidade de código de aplicação resolve nenhuma das duas sem mudar a arquitetura do site: `sitemap.xml`/`robots.txt` são arquivos estáticos porque o site é uma SPA com build estático (sem servidor rodando em produção) — editá-los pelo painel exigiria renderização no servidor ou uma Cloud Function agendada regerando os arquivos. Relatórios usa contagens reais gravadas no Firestore, mas não substitui uma integração com Google Analytics (origem de tráfego, dispositivo, funil) — pode ser adicionada depois sem afetar o que já existe.

## Ativando o Firebase (Authentication, Firestore, Storage e Cloud Functions)

1. O projeto já existe em [console.firebase.google.com](https://console.firebase.google.com) (`ronald-filmmaker`) e a configuração já está preenchida em `src/lib/firebase.ts` — não há `.env` neste projeto nem variáveis de ambiente para configurar. A config de um app Firebase para web (`apiKey`, `authDomain`, `projectId`, `appId`) não é secreta: ela precisa mesmo ir para dentro do bundle do navegador, e quem protege os dados são as regras (`firestore.rules`/`storage.rules`), não esconder essas quatro strings.
2. Ative o **Authentication** com o provedor E-mail/Senha, caso ainda não esteja ativo (Firebase Console → Authentication → Sign-in method).
3. Crie manualmente o usuário administrador em Firebase Console → Authentication → Users → **Add user** (e-mail e senha). O cadastro público continua desabilitado de propósito — só quem você criar manualmente consegue entrar.
4. Ative o **Cloud Firestore** (Firebase Console → Firestore Database → Criar banco de dados) e o **Storage** (Firebase Console → Storage → Começar), se ainda não estiverem ativos.
5. Publique as regras de segurança deste projeto (não use as regras padrão de teste): instale o [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`), rode `firebase login`, e depois `firebase deploy --only firestore:rules,storage`. Isso publica `firestore.rules` e `storage.rules` no projeto `ronald-filmmaker` (já configurado em `.firebaserc`).
6. Para apontar este projeto para um Firebase diferente, troque os quatro valores de `firebaseConfig` em `src/lib/firebase.ts` (Firebase Console → Configurações do projeto → Seus apps → Config do SDK) — não precisa rebuild com variáveis especiais, é só editar o arquivo.
7. **Cloud Functions (compressão de vídeo no servidor) é opcional, mas exige o plano Blaze** (pago, por uso — Cloud Functions não roda no plano gratuito Spark). Sem isso, o painel continua funcionando normalmente: cada upload de vídeo simplesmente cai direto no fallback de compressão no navegador (ffmpeg.wasm), como acontecia antes desse pipeline existir. Para ativar o processamento no servidor, ver o passo a passo completo, custos esperados e o que já foi verificado em `functions/README.md`.

`/admin` é uma rota protegida: sem login, redireciona para `/admin/login`. Enquanto a coleção `portfolioProjects` do Firestore estiver vazia, o site público continua mostrando o catálogo mock de `src/data/portfolio.ts` — assim que o primeiro projeto real for criado pelo painel, o site passa a mostrar dados reais automaticamente.

## Fast-follow (fora do escopo desta entrega)

- **Dashboard com gráficos**: hoje é cartões numéricos; um gráfico de série temporal (visualizações/cliques por dia) é aditivo sobre os mesmos eventos de `analyticsEvents`.
- **SEO por `robots.txt`/`sitemap.xml`/`llms.txt` editável**: exige renderização no servidor ou uma Cloud Function agendada, não é uma mudança só de painel — ver a nota na seção acima.
- **Integração com Google Analytics** nos Relatórios.
- **Reordenação por arrastar-e-soltar**: hoje é por botões de subir/descer, que já persistem a ordem real no Firestore — a UX final de arrastar é uma troca de interação, não de dado.
- **LGPD/cookies/páginas legais** dentro de Configurações gerais (hoje cobre só a seção Sobre).

## Notas sobre os placeholders

- Os três primeiros projetos do portfólio (Campo Azul, Uma Noite em Branco, Clima de Copa na Loja) são vídeo e fotos reais, cedidos pelo Ronald. O restante do catálogo, e todo o resto do site (foto de perfil, imagens de categoria sem projeto real ainda, etc.), usa URLs do Picsum Photos como placeholder — crie os projetos reais pelo painel administrativo (`/admin/projetos/novo`) quando o conteúdo existir; eles passam a aparecer no site automaticamente assim que publicados.
- O Hero (`src/sections/Hero.tsx`) é hoje um splash só de logo, sem título/vídeo configuráveis — por isso não existem mais campos de Hero/Showreel em Configurações gerais nem no schema de `SiteSettings`.
- As seções de depoimentos, clientes e FAQ (e suas telas no painel administrativo) foram removidas do projeto por não estarem mais em uso no site público. `Stat`/`getStats()` continuam no código (usados por nenhuma tela do painel) apenas porque nunca fizeram parte do menu administrativo — não são afetados por esta remoção.
