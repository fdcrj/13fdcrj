# 13º FDCRJ — Guia de Cervejas

Site interativo publicado em:

https://fdcrj.github.io/13fdcrj/

Os registros são carregados automaticamente da aba `All Beers` da planilha do 13º Festival de Confrarias do Rio de Janeiro.

A publicação é feita pelo workflow `.github/workflows/pages.yml`.

## Login exclusivo com Google

O site usa Firebase Authentication com o provedor Google. O botão apresenta o logotipo Google; o login tenta a janela pop-up e, se o navegador a bloquear ou não oferecer suporte, recorre ao redirecionamento. Erros de domínio não autorizado e provedor desativado são mostrados junto ao botão. A configuração pública do aplicativo fica em `js/firebase-config.js` e o fluxo de login fica em `js/auth.js`. Não há provedor GitHub habilitado no código.

Para o login funcionar, no Firebase Console do projeto `fdcrj-a71e4`, confirme que Google está habilitado em **Authentication → Sign-in method** e que `fdcrj.github.io` consta em **Authentication → Settings → Authorized domains**. Adicione também `localhost` para testes locais e o domínio exato de qualquer ambiente de pré-visualização usado.

O login não exige chave privada nem arquivo de conta de serviço. O objeto de configuração Web do Firebase é público e está restrito ao projeto `fdcrj-a71e4`.

## Navegação do guia

O guia é dividido em quatro abas horizontais sem numeração: **Consulta** concentra busca, filtros e os demais recursos; os resultados só aparecem após uma busca ou filtro. **Cervejas do Evento** mostra o catálogo integral em cards compactos com informações essenciais; ao abrir um card, a ficha detalhada continua disponível. **Status** apresenta simultaneamente Aguardando, Engatado, Acabou, Reserva e Outros/sem status. **Confrarias** reúne a tabela de organizadoras e os perfis individuais, expandidos por padrão. No celular, as abas podem ser percorridas lateralmente.

Os campos de busca e filtros abrem por padrão, respeitando a preferência já salva no navegador. Na ficha de uma cerveja, avaliação e degustação ficam em uma expansão própria, recolhida até que a pessoa queira registrar informações. A URL pública do site e o endereço já configurado da planilha permanecem inalterados; o endereço da planilha não é apresentado como link na interface. Como o guia é estático, o navegador precisa acessar a planilha diretamente para carregar os dados.

## Avaliações públicas

As notas são gravadas no Firestore em `beerRatings/{slug}/votes/{uid}`. Cada conta Google pode manter uma nota de 1 a 5 por cerveja. O catálogo calcula a média, mostra a quantidade de votos e permite ordenar por **Nota pública**.

No Firebase Console, abra **Firestore Database**, crie o banco de dados e publique as regras do arquivo `firestore.rules`. A leitura dos votos é pública para que o ranking apareça sem login; a gravação, alteração e exclusão ficam limitadas ao próprio usuário autenticado.

## Status Na torneira

O catálogo lê a coluna `Status Engate` das abas públicas das confrarias e combina o resultado com a aba `All Beers`. A aba **Status** mostra simultaneamente `Aguardando`, `Engatado`, `Acabou`, `Reserva` e `Outros / sem status`, contabilizando também registros vazios ou com rótulos diferentes. Cada cerveja pode ser aberta dali para consultar a ficha completa. Somente `Engatado` é tratado como **Na torneira** e aparece no filtro correspondente.

## Referência BJCP 2021 e Estilos Rio

As fichas exibem um painel expansível que associa automaticamente o estilo informado na planilha às 128 entradas BJCP 2021, com resumos autorais e notas históricas quando pertinentes. X1–X5 são identificados como estilos locais do Apêndice B do BJCP.

Uma biblioteca separada acrescenta as seis fichas do Anexo II — Estilos Rio: o estilo-base 99A e cinco variações de inscrição 99B. Elas são apresentadas como estilos locais do 13FDCRJ, não como categorias oficiais do BJCP. A consulta dos estilos BJCP encaminha à tradução oficial em português brasileiro e nenhuma biblioteca reproduz o texto integral do guia. Veja [fontes e política de uso](bjcp-sources.md).

## Diretório de confrarias e premiações

O antigo painel de gráficos foi substituído por um diretório de confrarias. A seção do diretório e a tabela de organizadoras permanecem visíveis; cada ficha individual, tanto atual quanto histórica, começa recolhida e pode ser aberta para mostrar região, encontros, participação, organização, links oficiais e totais de premiações. Os detalhamentos de prêmios e fontes também permanecem em expansões próprias. O catálogo e as fontes ficam em `data/confraria-profiles.json`; as notas de cobertura de cada perfil indicam lacunas e limites de confirmação.

Uma seção alfabética separada registra cinco confrarias medalhistas e quatro participantes históricos sem medalha localizada no registro consultado: ConfraMendes, C4G, CCZO e Suburbreja. Nenhuma integra o cadastro atual, o que não presume encerramento das atividades. “4CRJ” e “4 Cantos RJ” foram identificadas como nomes do mesmo grupo e aparecem em um único perfil. Para Cocejucana, a ficha também ressalva um comentário público de 2026 que demonstra interesse em vaga, mas não comprova participação oficial na 12ª edição. As fontes e totais estão documentados em `confrarias-historicas-fontes.md`.

Conforme a tabela da página atual do site fornecida pelo usuário, o diretório registra agora a confraria organizadora e o local para todas as edições de `1FDCRJ` a `13FDCRJ`, na ordem indicada. Esses dados substituem as atribuições parciais ou divergentes anteriormente reunidas. Para as duas primeiras edições, os regulamentos anexados também listam, respectivamente, oito e treze confrarias; pela orientação do usuário, todas as listadas são consideradas presentes no dia.

Nas abas `1FDCRJ` a `12FDCRJ` da planilha histórica, a posição 1 corresponde a ouro, 2 a prata e 3 a bronze, conforme a orientação do usuário. Menções sem posição numérica não entram na soma de medalhas. Resultados de outros concursos só são incluídos com fonte pública; dados de ano ou mês não localizados são deixados sem inferência.

Uma premiação individual só é associada ao perfil de uma confraria quando a fonte confirma que a pessoa integrava o grupo no período do resultado. Quando a fonte publica apenas um total de medalhas do cervejeiro sem ligar a cor a uma cerveja específica, o painel explicita essa limitação e não inventa a atribuição por rótulo.

O levantamento considerou as doze abas de edição fornecidas e resultados externos publicamente verificáveis. O Instagram oficial do FDCRJ (`@fdcrj`) foi consultado como fonte complementar de contexto; comentários em suas publicações não são tratados como confirmação de inscrição, participação oficial ou premiação. O link do registro histórico fornecido pelo usuário não é publicado no site.

O painel **Encontre sua cerveja** abre por padrão. A escolha de abrir ou fechar continua salva no navegador, de modo que uma preferência explícita da pessoa é respeitada.
