# Consolidação de faturas

O upload de 1 a 10 arquivos TXT gera um único XLSX. A coluna `Arquivo` e o número do registro original mantêm a origem de cada dado.

## Fechamento Mensal

A primeira aba reproduz sempre as categorias e os valores fixos do arquivo `FechamentoMensal_RIP_Vencimento_2026-04_20260911154202539 (1).csv`, fornecido pelo usuário. Seu total é R$ 35.581,24. Uma nota na aba identifica o vencimento de abril de 2026 e explica que os valores são uma referência fixa, sem relação com os TXT processados. As demais abas são calculadas a partir dos arquivos enviados.

## Demais abas

`Síntese`, `Faturas`, `Linhas Telefônicas`, `Síntese por Linha`, `Multas`, `Serviços e Cobranças`, `Detalhamento` e `Registros Brutos` refletem os TXT processados.

- O total consolidado soma uma vez o total reconciliado de cada fatura. Se alguma não tiver total reconciliado, o total fica vazio.
- Na Claro/FEBRABAN, gastos por linha usam os resumos tipo `1`. Registros tipo `4` detalham esses valores e não são somados novamente.
- A aba `Multas` recebe apenas cobranças tipo `4` cuja descrição contém `multa` ou `multas`.
- Registros Vivo sem campos financeiros confirmados permanecem no Excel, mas não geram um total consolidado.
- Arquivos com conteúdo binário idêntico são recusados no mesmo lote para evitar duplicação de gastos.
