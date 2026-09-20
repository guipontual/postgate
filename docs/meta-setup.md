# Instagram: o que a Meta exige

Nada disto dá para empacotar — o token é da sua conta.

1. **Conta Instagram Business ou Creator.** Conta pessoal não publica por API.
2. **Página do Facebook vinculada** à conta do Instagram.
3. **App na Meta** (developers.facebook.com) com o produto *Instagram Graph
   API*, e as permissões `instagram_basic`, `instagram_content_publish`,
   `pages_show_list`.
4. **Token de longa duração** (60 dias) e o **IG User ID** da conta.

Guarde como `META_LONG_LIVED_TOKEN` e `IG_USER_ID`.

## O que morde depois

- **60 dias passam.** Chame `renovarToken()` num cron mensal e grave o valor
  novo onde você guarda segredo. Renovar não estende para sempre: é preciso
  renovar antes de expirar, senão o caminho é refazer tudo à mão.
- **Limite de publicação**: 25 posts por 24h por conta. A fila respeita a sua
  cadência, não o limite — se você enfileirar 40, os últimos falham.
- **Stories não aceita legenda.** O texto precisa estar na própria arte
  1080×1920. A legenda continua útil no card de aprovação.
- **Reels demora.** O container passa por processamento antes de poder
  publicar; o código espera. Vídeo grande pode estourar o tempo.
