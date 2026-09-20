<p align="center">
  <img src="assets/banner.svg" alt="PostGate" width="720">
</p>

<p align="center">
  <a href="README.md">English</a> · <b>Português</b>
</p>

<p align="center">
  <b>Fila, aprovação humana e publicação agendada para redes sociais.</b><br>
  Um agente propõe. Uma pessoa aprova do celular. O post vai ao ar na hora certa.
</p>

<p align="center">
  <img alt="MIT" src="https://img.shields.io/badge/licença-MIT-4ADE80">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178C6">
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A520-5FA04E">
  <img alt="LLM" src="https://img.shields.io/badge/LLM-nenhum%20obrigatório-8FA3BF">
</p>

---

## O problema

Automatizar post em rede social é fácil até o dia em que a automação publica
algo errado. Aí você descobre três coisas de uma vez: que ninguém revisou, que
o erro é público, e que não existe botão de desfazer que apague o print que
alguém já tirou.

A resposta comum é desligar a automação e voltar a postar à mão. PostGate é a
outra resposta: **mantenha a automação, ponha um humano no portão.**

## Como funciona

```
   sua fonte          fila            Telegram          decisão           cron
  ───────────▶  ─────────────▶  ─────────────────▶  ────────────▶  ─────────────▶
   buildDrafts    pending          card com dois       scheduled       publica no
                                   botões              + horário       horário marcado
```

Cinco peças, cada uma podendo falhar sozinha sem derrubar as outras:

| peça | o que faz |
|---|---|
| **fonte** | decide **o que** postar. É a única parte que você escreve. |
| **fila** | guarda o rascunho e o estado. Postgres comum. |
| **portão** | manda para o Telegram e espera uma pessoa decidir. |
| **publicador** | um cron que publica o que já foi aprovado e venceu. |
| **saúde** | avisa quando a fila para de andar. |

## Funciona com qual LLM?

**Com todos — porque não usa nenhum.**

PostGate não fala com modelo de linguagem. Ele recebe rascunhos prontos de uma
fonte que você implementa:

```ts
interface ContentSource {
  readonly name: string;
  buildDrafts(count: number): Promise<Draft[]>;
}
```

Se a sua fonte é um `SELECT` no banco com um template de string, ótimo — é
assim que o sistema de origem funciona, sem LLM nenhum, publicando desde 2026.

Se você quiser um modelo escrevendo a legenda, use `src/sources/llm-legenda.ts`.
Ele recebe **uma função**, não um SDK:

```ts
const fonte = new LlmLegenda({
  itens: async () => meuBanco.buscarNovidades(),
  completar: async (prompt) => chamarSeuModelo(prompt),   // Ollama, Claude, GPT, Gemini…
});
```

Qualquer coisa que saiba responder `prompt → texto` serve, inclusive uma
função fixa num teste. **Não há dependência de fornecedor no projeto, de
propósito**: biblioteca de fila que traz SDK é como se herda um provedor que
não se escolheu.

## Começando em cinco minutos

```bash
npm install
cp .env.example .env
psql "$DATABASE_URL" -f migrations/0001_postgate_queue.sql

echo '[{"ref":"1","link":"https://exemplo.com","image":"https://picsum.photos/1080","text":"Primeiro post."}]' > content.json

npm run enqueue                  # propõe e manda o card para o Telegram
npm run approve-polling          # aprove pelo celular
npm run publish-due -- --dry-run # confere tudo sem publicar nada
```

O `--dry-run` é o passo que evita a primeira decepção: ele confirma que a
**Meta consegue baixar a sua mídia**, que a legenda cabe no limite, e que as
credenciais existem — antes de qualquer coisa ir ao ar.

## Os dois modos de aprovação

| modo | exige | quando |
|---|---|---|
| **polling** — `npm run approve-polling` | nada | máquina em casa, CGNAT, sem domínio |
| **webhook** — `tratarUpdate()` na sua rota | HTTPS público | app já hospedado |

O webhook do Telegram exige endereço público com certificado. Quem roda atrás
de CGNAT não tem isso — e foi exatamente o que manteve o sistema de origem
preso a uma hospedagem por meses. O polling remove a amarra: para aprovar um
post, alguns segundos a mais não custam nada.

## Decisões de projeto, e o incidente por trás de cada uma

Este projeto foi extraído de um sistema em produção. As três decisões abaixo
não são preferência de estilo — cada uma é a cicatriz de um problema real.

**1. Aprovar agenda; não publica.**
Publicar no instante da aprovação amarra o horário do post ao momento em que
alguém olhou o celular. Separado, dá para aprovar às 23h um post que vai ao ar
às 9h — e o servidor pode estar desligado no meio.

**2. Publicar e registrar são passos separados.**
Quando os dois viviam no mesmo `try`, uma publicação bem-sucedida com gravação
falha caía no `catch` e virava `failed` — **com a mídia já no ar**. Hoje, se o
registro falhar depois da publicação, o sistema grita em vez de mentir: avisa
que o post existe, dá o `media_id`, e pede correção manual. Nunca marca falho
o que foi publicado.

**3. O portão é de aprovação, não de controle de qualidade.**
Filtrar o que não presta é trabalho da fonte. Se quem aprova vira filtro de
qualidade, aprende a apertar "recusar" no automático e para de ler — e aí o
portão deixa de valer alguma coisa.

## O que você precisa ter

- **Postgres.** Supabase serve; nada no schema é exclusivo dele.
- **Um bot do Telegram** e o grupo onde ele manda os cards.
- **Instagram Business ou Creator e um app seu na Meta.** Veja
  [docs/meta-setup.pt-BR.md](docs/meta-setup.pt-BR.md) — isso não dá para empacotar, o
  token é da sua conta.

## Armadilhas que já custaram caro

- **A mídia é baixada pelos servidores da Meta, não pelo seu.** URL que abre no
  seu navegador mas exige sessão, ou responde só na sua rede, falha com erro
  genérico. O `--dry-run` confere isso antes.
- **O token de 60 dias expira.** `renovarToken()` existe; rode num cron mensal.
  Esquecer é descobrir num domingo que nada é publicado há semanas.
- **"Cannot parse access token" quase nunca é o token.** A Meta tem dois
  caminhos com hosts diferentes: `graph.instagram.com` (Instagram Login, o
  padrão aqui) e `graph.facebook.com` (Login do Facebook + Página). Token de um
  não é aceito pelo outro, e o erro é idêntico ao de token expirado. Ajuste
  `META_GRAPH_HOST` em vez de gerar token novo.
- **Stories não aceita legenda.** O texto precisa estar na arte 1080×1920.
- **25 posts por 24h** é o limite da conta. A fila respeita a sua cadência, não
  o limite: enfileirar 40 faz os últimos falharem.

## Estado

Extraído e reorganizado a partir de um sistema em produção. Verificado até
aqui: typecheck limpo, testes passando, e a fila exercitada contra Postgres de
verdade (enfileirar, deduplicar, decidir, vencer, idempotência da decisão).

Também verificado: o cliente do Instagram conversa com a conta real e a
credencial é aceita (chamada de leitura, sem publicar).

Não verificado ainda: uma publicação real de ponta a ponta a partir deste
código reorganizado.

## Licença

MIT — veja [LICENSE](LICENSE).
