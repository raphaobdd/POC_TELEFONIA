# Claro/FEBRABAN: mapeamento validado

Referência analisada: `874990746_111360636_2026_08_53_Febraban.txt`, mantida fora do repositório. Arquivo Windows-1252, 3.209 linhas CRLF, todas com 350 caracteres. Posições abaixo são **inclusivas e começam em 1**. Este é um mapeamento empírico do arquivo recebido; a especificação completa da FEBRABAN V3R0 não estava disponível para conferência de todos os nomes de campo.

## Estrutura e campos confirmados pelo arquivo

| Tipo | Quantidade | Conteúdo observado | Campos extraídos |
|---|---:|---|---|
| `0` | 1 | Cabeçalho | 1 tipo; 2–13 sequência; 22–36 `CLARO S/A`; 39–47 identificador do cliente; 57–92 empresa; 94–107 CNPJ; 109–117 conta; 134–141 data A; 142–149 data B |
| `1` | 57 | Resumo por recurso | 2–13 sequência; 14–22 conta; 55–65 telefone (um resumo sem telefone); 110–120 telefone repetido; 125–150 descrição; 301–314 valor sinalizado em centavos |
| `3` | 157 | Detalhamento de chamadas | 2–13 sequência; 30–40 telefone do recurso; 89–96 data; 178–202 categoria textual; demais campos não interpretados |
| `4` | 2.993 | Serviço ou cobrança | 2–13 sequência; 30–40 telefone do recurso; 87–94 data; 218–257 descrição; 258–271 valor sinalizado em centavos |
| `9` | 1 | Totalizador | 2–13 sequência; 14–22 identificador do cliente; 29–37 conta; 70–81 quantidade total de registros; 82–93 quantidade de resumos tipo `1`; 94–107 valor total sinalizado em centavos |

O identificador de cliente, a conta, o ano/mês e o ciclo no **nome do arquivo** seguem a explicação da [FAQ oficial da Claro](https://contaonline.claro.com.br/webbow/login/initPJ_faq.do). A identificação dos campos internos acima foi conferida pelas repetições, formatos e controles do próprio TXT. O arquivo não é CNAB 240.

Valores monetários confirmados no conjunto observado usam um sinal `+` ou `-` seguido de 13 dígitos, com duas casas decimais implícitas. O parser guarda o valor como **centavos inteiros**, preservando o sinal. As colunas em reais no Excel são apenas a apresentação desses centavos.

Cada registro tipo `3` ou `4` segue o resumo tipo `1` do mesmo telefone. As 2.993 cobranças e os 157 detalhamentos encontram um resumo anterior compatível; os dois lançamentos sem telefone pertencem ao único resumo sem telefone. O vínculo é informado pelo número do registro original.

## Reconciliação do arquivo de referência

| Controle | Resultado |
|---|---:|
| Registros declarados no trailer | 3.209 |
| Registros lidos | 3.209 |
| Resumos declarados no trailer | 57 |
| Resumos lidos | 57 |
| Telefones distintos nos resumos | 56 |
| Soma dos resumos `1` | R$ 1.369,40 |
| Soma das cobranças `4` | R$ 1.369,40 |
| Valor do trailer `9` | R$ 1.369,40 |
| Divergência | R$ 0,00 |

Os resumos e as cobranças representam dois níveis da **mesma fatura**. O Excel não soma ambos em um total único. Os registros tipo `3` não foram incluídos na soma financeira, pois seu campo monetário não foi confirmado.

## Inferências e limites

- A referência `08/2026` é **inferida** da data B (`20260818`) e é compatível com o ano/mês no nome do arquivo; o significado formal da data B ainda não foi confirmado.
- As datas A e B do cabeçalho são exportadas com suas posições, sem chamá-las de vencimento ou emissão.
- A descrição do resumo tipo `1` e as descrições tipo `4` são extraídas como texto. O significado das demais posições, impostos, tarifas, sinais auxiliares, duração e destino das chamadas tipo `3` permanece desconhecido.
- A interpretação é apresentada como **parcial** mesmo quando os valores conciliam. Registros fora de 350 caracteres ou com tipo desconhecido são preservados integralmente e geram aviso.
- O conteúdo original de todas as 3.209 linhas é mantido na aba **Registros Brutos**; não se descarta registro desconhecido ou inválido.

A [Anatel](https://www.anatel.gov.br/Portal/verificaDocumentos/documento.asp?assuntoPublicacao=null&caminhoRel=null&documentoPath=271031.pdf&filtro=1&numeroPublicacao=271031) confirma a existência das versões 2.0 e 3.0 do layout de conta eletrônica e informa que o campo de telefone comporta DDD de 2 dígitos mais número de até 10 dígitos. Isso não substitui a validação dos offsets específicos do arquivo Claro.
