# Cloud Functions — compressão e otimização de vídeo

Este diretório é um projeto Node/TypeScript separado (`functions/package.json`
próprio, não importa nada de `src/`) que roda no Cloud Functions for
Firebase. Ele existe para um único trabalho: quando um admin envia um vídeo
pelo painel, comprimir/otimizar/gerar miniaturas **no servidor**, em vez de
no navegador da pessoa — ver `src/processVideo.ts` para o pipeline completo
e `src/ffmpegParams.ts` para a lógica de decisão adaptativa (CRF, resolução,
skip-transcode etc.).

## Isso exige o plano Blaze (pago, por uso)

Cloud Functions **não roda no plano Spark (gratuito)** — é uma exigência da
própria Firebase, não deste código. Sem migrar o projeto para o plano Blaze
em [console.firebase.google.com](https://console.firebase.google.com) →
⚙️ Configurações do projeto → Uso e faturamento, nenhuma das três funções
abaixo é implantada nem executada.

**Custo esperado.** O Blaze só cobra pelo que passar da cota gratuita
mensal do Spark (que continua valendo mesmo no Blaze) — na prática, para um
site com volume baixo/médio de uploads, o custo tende a ficar próximo de
zero a poucos dólares por mês. Os itens que pesam mais aqui são:

- **Cloud Functions**: `processVideo` roda com 4GiB de RAM / 2 vCPUs por até
  30 minutos (`timeoutSeconds: 1800`) — o tempo de execução real depende do
  tamanho/duração do vídeo. É cobrado por tempo de CPU+memória usado, não por
  tempo alocado ocioso.
- **Cloud Storage**: armazenamento dos arquivos originais (temporários),
  otimizados e das miniaturas, mais egress ao servir os vídeos otimizados no
  site público.
- **Cloud Firestore**: leituras/escritas em `videoProcessingJobs/{jobId}}` —
  o pipeline throttla escritas de progresso a uma a cada 3s
  (`PROGRESS_WRITE_INTERVAL_MS` em `processVideo.ts`) justamente para manter
  isso barato.

Não há como estimar um valor exato sem saber o volume real de uploads —
acompanhe pelo painel de faturamento do Firebase nas primeiras semanas.

## O que existe aqui

| Função | Tipo | O que faz |
| --- | --- | --- |
| `processVideo` | Storage trigger (`onObjectFinalized`) | Dispara quando um arquivo termina de subir em `videos/original/`. Analisa (ffprobe), decide parâmetros de codificação adaptativos, comprime (ou faz remux sem recodificar, se a fonte já for eficiente), gera 3 miniaturas, sobe para `videos/optimized/` e `videos/thumbnails/`, grava tudo em `videoProcessingJobs/{jobId}`, apaga o original temporário. |
| `regenerateThumbnail` | Callable (`onCall`) | Backend do botão "Tentar outro frame" no painel, para vídeos processados no servidor — gera uma nova miniatura em um timestamp diferente e grava em um **novo** caminho (nunca sobrescreve, porque as miniaturas são servidas com cache imutável de 1 ano). |
| `cleanupOrphanedOriginals` | Scheduled (`onSchedule`, diário) | Varre `videos/original/` e apaga qualquer arquivo com mais de 48h — rede de segurança contra uploads que falharam antes do trigger rodar ou que nunca dispararam. |

## Implantação

```bash
# a partir da raiz do projeto (não de dentro de functions/)
firebase deploy --only functions,firestore:rules,storage
```

O `predeploy` já configurado em `firebase.json` roda `npm run build` dentro
de `functions/` automaticamente antes do deploy — não é preciso compilar
manualmente primeiro (mas `npm run build` aqui dentro é útil para checar
erros de TypeScript localmente).

Pré-requisitos antes do primeiro deploy:

1. Projeto no plano Blaze (acima).
2. `npm install` dentro de `functions/` (se ainda não tiver sido feito).
3. Login/projeto certo selecionados na Firebase CLI (`firebase login`,
   `firebase use <project-id>`).

## Região: precisa bater dos dois lados

`processVideo` e `regenerateThumbnail` estão fixadas em `region:
"us-central1"` (ver o objeto de opções passado a `onObjectFinalized`/
`onCall` em cada arquivo). O cliente (`src/lib/firebase.ts`) chama
`getFunctions(app, "us-central1")` com a mesma região.

**Isso importa porque um descompasso de região não dá erro nenhum — a
chamada simplesmente aponta para uma função que não existe naquela região e
todo `httpsCallable` falha com 404/`not-found`.** Se um dia mudar a região
de deploy, lembrar de atualizar `src/lib/firebase.ts` junto.

## Limites e configurações

- **Tamanho máximo de upload**: 500MB, aplicado tanto no cliente
  (`src/lib/videoUpload.ts`) quanto — o que realmente importa para
  segurança — nas próprias Storage Rules (`storage.rules`, bloco
  `videos/original/{allPaths=**}`: `request.resource.size < 500 * 1024 *
  1024`). Um upload maior é rejeitado pelo Storage antes mesmo de chegar
  perto de rodar a função.
- **`KEEP_4K_RESOLUTION`** (`src/ffmpegParams.ts`, linha ~51): `false` por
  padrão — vídeos 4K são reduzidos para a versão web em 1080p (conforme a
  especificação original: "manter apenas se resolução muito superior à
  necessária para exibição web"). Mudar para `true` desativa esse downscale
  e mantém a resolução nativa do 4K — aumenta bastante o tempo de
  processamento e o tamanho final, então normalmente não é o que se quer
  para vídeos exibidos no site.
- **Timeout de processamento**: 30 minutos por vídeo
  (`timeoutSeconds: 1800` em `processVideo.ts`). Um vídeo que não termina
  de processar nesse tempo falha e o job fica com `status: "error"` — o
  painel então cai automaticamente para a compressão no navegador (ver
  abaixo).

## Fallback: compressão no navegador continua existindo

O painel (`src/components/admin/VideoDropzone.tsx`) sempre tenta primeiro
o caminho servidor (upload do arquivo bruto → esta Cloud Function). Se
qualquer coisa impedir esse caminho — Firebase não configurado localmente,
a própria função ainda não implantada, o job não aparece no Firestore em
25 segundos, ou o job termina com `status: "error"` — ele cai
automaticamente para o compressor original no navegador
(`src/lib/videoCompression.ts`, ffmpeg.wasm), exatamente como funcionava
antes deste pipeline existir. Isso foi uma decisão explícita: publicar um
vídeo nunca deve ficar impossível só porque o pipeline do servidor teve um
dia ruim.

## O que foi verificado — e o que **não** foi

O que foi verificado nesta sessão de desenvolvimento, com execução real
(não só leitura de código):

- TypeScript compila sem erros (`npm run build` aqui dentro, `tsc -b
  --noEmit` na raiz do projeto).
- A lógica de ffmpeg (`ffmpegParams.ts` + `ffmpegRunner.ts`) foi testada
  rodando `probeVideo` → `chooseEncodingParams` → `encodeVideo`/
  `remuxToMp4` → `extractThumbnail` diretamente contra vídeos reais, fora
  do ambiente de Cloud Functions — incluindo o caso de uma fonte já
  eficiente (onde o pipeline corretamente faz remux sem recodificar, 0%
  de mudança de tamanho) e o caso de uma fonte ineficiente (onde o
  pipeline recodifica e reduz ~95% do tamanho).

O que **não** foi (e não podia ser, neste ambiente) verificado:

- **Deploy real** — este ambiente de desenvolvimento não tem acesso a um
  projeto Firebase de verdade no plano Blaze, então as três funções nunca
  foram efetivamente implantadas nem executadas dentro do Cloud
  Functions/Cloud Run.
- **O gatilho do Storage disparando de verdade** (`onObjectFinalized`) —
  só testado indiretamente, chamando a lógica interna de forma isolada.
- **O ciclo completo com o Firestore** — o app cliente escrevendo/lendo
  `videoProcessingJobs/{jobId}` contra um Firestore real durante um
  processamento em andamento.
- **Autenticação em produção da função callable** `regenerateThumbnail`
  (checagem de admin via App Check/Auth em contexto real de produção).
- **Comportamento real de cobrança** no plano Blaze.
- **Permissões de IAM/service account** do projeto Firebase real — o
  service account padrão do Cloud Functions geralmente já tem acesso ao
  bucket do Storage e ao Firestore do mesmo projeto, mas isso não foi (e
  não podia ser) confirmado sem um projeto real.

**Recomendação**: antes de divulgar a funcionalidade para uso real, testar
manualmente uma vez em produção — subir um vídeo de teste pelo painel,
acompanhar `videoProcessingJobs/{jobId}` no console do Firestore, e
conferir se `videos/optimized/` e `videos/thumbnails/` recebem os arquivos
esperados.
