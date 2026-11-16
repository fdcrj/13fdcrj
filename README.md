# 13º FDCRJ — Guia de Cervejas

Site interativo publicado em:

https://fdcrj.github.io/13fdcrj/

Os registros são carregados automaticamente da aba `All Beers` da planilha do 13º Festival de Confrarias do Rio de Janeiro.

A publicação é feita pelo workflow `.github/workflows/pages.yml`.

## Login exclusivo com Google

O site usa Firebase Authentication com o provedor Google. A configuração pública do aplicativo fica em `js/firebase-config.js` e o fluxo de login fica em `js/auth.js`. Não há provedor GitHub habilitado no código.

No Firebase Console, mantenha o provedor Google ativo em **Authentication → Sign-in method** e adicione `fdcrj.github.io` em **Authentication → Settings → Authorized domains**. Para testar localmente, adicione também `localhost`.

O login não exige chave privada nem arquivo de conta de serviço. O objeto de configuração Web do Firebase é público e está restrito ao projeto `fdcrj-a71e4`.
