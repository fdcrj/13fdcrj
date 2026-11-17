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

## Referência BJCP 2021 e Estilos Rio

As fichas exibem um painel expansível que associa automaticamente o estilo informado na planilha às 128 entradas BJCP 2021, com resumos autorais e notas históricas quando pertinentes. X1–X5 são identificados como estilos locais do Apêndice B do BJCP.

Uma biblioteca separada acrescenta as seis fichas do Anexo II — Estilos Rio: o estilo-base 99A e cinco variações de inscrição 99B. Elas são apresentadas como estilos locais do 13FDCRJ, não como categorias oficiais do BJCP. A consulta dos estilos BJCP encaminha à tradução oficial em português brasileiro e nenhuma biblioteca reproduz o texto integral do guia. Veja [fontes e política de uso](bjcp-sources.md).

## Diretório de confrarias e premiações

O antigo painel de gráficos foi substituído por um diretório compacto. Cada cartão pode ser expandido para consultar região, encontros e links oficiais quando essas informações estão documentadas, além das premiações agrupadas por evento, edição e data. O catálogo e as fontes ficam em `data/confraria-profiles.json`; as notas de cobertura de cada perfil indicam lacunas e limites de confirmação.

Uma seção alfabética separada registra cinco confrarias medalhistas e oito participantes históricos sem medalha localizada no registro consultado: ConfraMendes, C4G, CCZO, Suburbreja, ConfraIPA de Nova Friburgo, Cervejeiras Cariocas (CC), Cervejeiros Caseiros Gonçalenses (CCG) e Confraria RJ (CRJ). Nenhuma integra o cadastro atual, o que não presume encerramento das atividades. “4CRJ” e “4 Cantos RJ” foram identificadas como nomes do mesmo grupo e aparecem em um único perfil. Para Cocejucana, a ficha também ressalva um comentário público de 2026 que demonstra interesse em vaga, mas não comprova participação oficial na 12ª edição. As fontes e totais estão documentados em `confrarias-historicas-fontes.md`.

Os regulamentos anexados para o 1º ao 5º FDCRJ listam, respectivamente, oito, treze, dezesseis, dezenove e dezenove confrarias. A 1ª e a 2ª edições atribuem a organização à Confraria 4 Cantos RJ, com apoio de membros das confrarias; a 3ª atribui a organização aos idealizadores da 4 Cantos RJ **e** da Confraria dos Cervejeiros Caseiros da Zona Sul (CCZS); a 4ª, aos idealizadores da 4 Cantos RJ **e** da Confraria dos Cervejeiros da Leopoldina e Adjacências (CCLA). Na 5ª, a capa indica “Realização: Insulana”, o art. 6º nomeia a INSULANA como confraria-sede e o art. 7º prevê comissões de organização; o art. 5º identifica dois membros da 4CRJ como idealizadores que podiam participar da organização. As datas são 17/07/2016, 18/12/2016, 15/07/2017, 20/01/2018 e 21/07/2018. Conforme orientação do usuário, todas as confrarias listadas nos regulamentos são consideradas presentes no dia; a regra vale também para os próximos anexos. Fontes já consultadas apontam participação da CCN na organização da 6ª edição (sem atribuir exclusividade) e a Cocejucana como organizadora da 7ª.

Nas abas `1FDCRJ` a `12FDCRJ` da planilha histórica, a posição 1 corresponde a ouro, 2 a prata e 3 a bronze, conforme a orientação do usuário. Menções sem posição numérica não entram na soma de medalhas. Resultados de outros concursos só são incluídos com fonte pública; dados de ano ou mês não localizados são deixados sem inferência.

Uma premiação individual só é associada ao perfil de uma confraria quando a fonte confirma que a pessoa integrava o grupo no período do resultado. Quando a fonte publica apenas um total de medalhas do cervejeiro sem ligar a cor a uma cerveja específica, o painel explicita essa limitação e não inventa a atribuição por rótulo.

O levantamento considerou as doze abas de edição fornecidas e resultados externos publicamente verificáveis. O Instagram oficial do FDCRJ (`@fdcrj`) foi consultado como fonte complementar de contexto; comentários em suas publicações não são tratados como confirmação de inscrição, participação oficial ou premiação. O link do registro histórico fornecido pelo usuário não é publicado no site.

## Organização por edição

O diretório mostra, no topo da seção de confrarias, o bloco **Quem organizou cada edição**, montado a partir dos registros de organização de cada perfil: 1ª a 5ª edições pelos regulamentos fornecidos; 6ª e 7ª por fontes públicas. Cada cartão de confraria organizadora recebe o selo **Organizadora** com as edições correspondentes, e a ficha detalha o item do regulamento ou a fonte que sustenta a indicação. Na 5ª edição, o bloco identifica a INSULANA como realizadora e confraria-sede, sem apagar o papel das comissões nem atribuir organização exclusiva à 4CRJ. Edições sem organizadora localizada não aparecem na lista, para não sugerir cobertura completa.

O painel **Encontre sua cerveja** começa recolhido. A escolha de abrir ou fechar fica salva no navegador, e a seção só muda de estado quando a pessoa a abre ou fecha novamente.
