# Aprovação: por que humana, e por que agenda

## Por que existe um humano no meio

Geração automática erra de formas que só uma pessoa nota: o mesmo assunto duas
vezes na semana, um número que não bate com a fonte, um tom que não é o da
marca. Nenhuma dessas falhas aparece em teste automatizado, e todas aparecem
publicamente.

O portão é de aprovação, não de revisão de qualidade. **Filtrar o que não
presta é trabalho da fonte.** Se quem aprova vira filtro de qualidade, ele
aprende a apertar "recusar" no automático e para de ler — e aí o portão deixa
de valer.

## Por que aprovar agenda em vez de publicar

Publicar no instante da aprovação amarra o horário do post ao momento em que
alguém olhou o celular. Separando:

- dá para aprovar de madrugada um post que vai ao ar de manhã;
- o servidor pode estar desligado entre a aprovação e a publicação;
- a publicação vira um passo isolado, que pode ser repetido sem repetir a
  decisão humana.

## Recusa que ensina

`postgate_feedback` guarda o motivo da recusa. Sem isso, o gerador propõe
amanhã exatamente o que foi recusado hoje — e a pessoa que aprova paga o preço
de uma memória que o sistema não tem.
