# PostGate

Fila, **aprovação humana** e publicação agendada para redes sociais.

Um agente (ou um script, ou você) propõe um post. Ele entra numa fila, chega
no seu Telegram com dois botões, e só vai ao ar depois que uma pessoa aprova —
no horário marcado, com o servidor podendo estar desligado no meio.

Extraído de um sistema em produção que publica imóveis desde 2026. O que era
específico daquele assunto virou uma interface; o resto — fila, portão de
aprovação, publicação, retentativa, saúde — é o que está aqui.

## Funciona com qual LLM?

**Com todos, porque não usa nenhum.**

O PostGate não fala com modelo de linguagem. Ele recebe rascunhos prontos de
uma fonte que você implementa:

```ts
interface ContentSource {
  readonly name: string;
  buildDrafts(count: number): Promise<Draft[]>;
}
```

Se a sua fonte for um `SELECT` no banco e um template de string, ótimo — é
assim que o sistema de origem funciona, sem LLM nenhum. Se você quiser um
modelo escrevendo a legenda, use `src/sources/llm-legenda.ts`: ele recebe uma
função `completar(prompt) => Promise<string>`. Qualquer coisa que responda a
isso serve — Ollama local, Claude, GPT, Gemini, Kimi, um endpoint interno, ou
uma função de teste que devolve texto fixo.

Não há SDK de fornecedor no projeto, de propósito. Dependência de fornecedor
dentro de uma biblioteca de fila é como se herda um provedor que não se
escolheu.

## O fluxo

```
  sua fonte  ──▶  fila  ──▶  Telegram  ──▶  decisão humana  ──▶  cron publica
             enqueue      dois botões       agenda, não posta    no horário
```

**Aprovar agenda; não publica.** Parece detalhe e não é: publicar no instante
da aprovação amarra o horário do post ao momento em que alguém olhou o
celular. Separado, dá para aprovar às 23h um post que vai ao ar às 9h.

## Começando

```bash
npm install
cp .env.example .env            # preencha; nada aqui vai para o repositório
psql "$DATABASE_URL" -f migrations/0001_postgate_queue.sql

echo '[{"ref":"1","link":"https://exemplo.com","imagem":"https://picsum.photos/1080","texto":"Primeiro post."}]' > conteudo.json
npm run enqueue                 # propõe e manda para o Telegram
npm run approve-polling         # aprove pelo celular
npm run publish-due -- --dry-run
```

## Os dois modos de aprovação

| modo | precisa de | quando usar |
|---|---|---|
| **polling** (`npm run approve-polling`) | nada | máquina em casa, CGNAT, sem domínio |
| **webhook** | HTTPS público | app já hospedado |

O webhook do Telegram exige endereço público com certificado. Quem roda atrás
de CGNAT não tem isso — e foi o que manteve o sistema de origem preso a uma
hospedagem por meses. O polling remove essa amarra: alguns segundos a mais
para aprovar um post não custam nada.

Para webhook, chame `tratarUpdate()` de `src/approval/handler.ts` na sua rota
e confira o cabeçalho `X-Telegram-Bot-Api-Secret-Token`.

## O que você precisa ter

- **Postgres** (Supabase serve; nada no schema é exclusivo dele).
- **Um bot do Telegram** e o grupo onde ele manda os cards.
- **Instagram Business/Creator e um app seu na Meta** — veja
  [docs/meta-setup.md](docs/meta-setup.md). Isso não dá para empacotar: o token
  é da sua conta.

## Três armadilhas que já custaram caro

1. **A mídia é baixada pelos servidores da Meta, não pelo seu.** URL que abre
   no seu navegador mas exige sessão, ou responde só na sua rede, falha com
   erro genérico. `--dry-run` confere isso antes.
2. **Publicar e registrar são passos separados.** Quando estavam no mesmo
   `try`, publicação bem-sucedida com gravação falha virava `failed` — com a
   mídia já no ar. Hoje, se o registro falhar, o sistema grita em vez de
   mentir.
3. **O token de 60 dias expira.** `renovarToken()` existe; rode num cron
   mensal. Esquecer é descobrir num domingo que nada é publicado há semanas.

## Licença

MIT.
