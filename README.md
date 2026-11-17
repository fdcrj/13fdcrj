# 13º FDCRJ — Guia de Cervejas

Site interativo publicado em:

https://fdcrj.github.io/13fdcrj/

Os registros são carregados automaticamente da aba `All Beers` da planilha do 13º Festival de Confrarias do Rio de Janeiro.

A publicação é feita pelo workflow `.github/workflows/pages.yml`.

## Login exclusivo com Google

O site usa Firebase Authentication com o provedor Google. A configuração pública do aplicativo fica em `js/firebase-config.js` e o fluxo de login fica em `js/auth.js`. Não há provedor GitHub habilitado no código.

No Firebase Console, mantenha o provedor Google ativo em **Authentication → Sign-in method** e adicione `fdcrj.github.io` em **Authentication → Settings → Authorized domains**. Para testar localmente, adicione também `localhost`.

O login não exige chave privada nem arquivo de conta de serviço. O objeto de configuração Web do Firebase é público e está restrito ao projeto `fdcrj-a71e4`.

## Avaliações públicas

As notas são gravadas no Firestore em `beerRatings/{slug}/votes/{uid}`. Cada conta Google pode manter uma nota de 1 a 5 por cerveja. O catálogo calcula a média, mostra a quantidade de votos e permite ordenar por **Nota pública**.

No Firebase Console, abra **Firestore Database**, crie o banco de dados e publique as regras do arquivo `firestore.rules`. A leitura dos votos é pública para que o ranking apareça sem login; a gravação, alteração e exclusão ficam limitadas ao próprio usuário autenticado.

## Status Na torneira

O catálogo lê a coluna `Status Engate` das abas públicas das confrarias e combina o resultado com a aba `All Beers`. Os estados esperados são `Aguardando`, `Engatado`, `Esgotado` e `Reserva`. O status aparece obrigatoriamente em cada card e ficha, com cores próprias; quando a célula estiver vazia, o site mostra `Não informado`. Somente `Engatado` é tratado como **Na torneira** e aparece no filtro correspondente; os demais estados continuam visíveis na ficha da cerveja.
