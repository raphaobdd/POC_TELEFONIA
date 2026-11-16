# Consolidação de faturas

O upload de 1 a 10 arquivos TXT gera **um único XLSX**. A coluna `Arquivo` e o número do registro original mantêm a origem de cada dado. O Excel contém `Fechamento Mensal`, `Síntese`, `Faturas`, `Linhas Telefônicas`, `Síntese por Linha`, `Multas`, `Serviços e Cobranças`, `Detalhamento` e `Registros Brutos`.

## Padrão do fechamento mensal

A primeira aba reproduz a estrutura de duas colunas do CSV `FechamentoMensal_RIP_Vencimento_2026-04_20260911154202539 (1).csv`: `Operadora`, linha vazia, `Rótulos de Linha` / `Soma de Valor`, categorias e `Total Geral`. As categorias são geradas a partir das descrições reais de cada fatura, sem copiar os valores do CSV. Quando há mais de uma operadora, cada uma recebe seu próprio bloco nessa mesma aba.

No layout Claro/FEBRABAN, os valores por categoria vêm dos registros de cobrança tipo `4`; o `Total Geral` só aparece quando a soma das categorias coincide com os totais reconciliados das faturas. Para Vivo, as categorias financeiras ainda não estão mapeadas: a aba mostra `Categorias não mapeadas` e deixa o total vazio, com aviso de interpretação parcial. O CSV fornecido serve de modelo visual, não de fonte de valores para outros períodos.

## Critérios financeiros

- O total consolidado soma **uma vez** o total reconciliado de cada fatura. Se alguma fatura não tiver total reconciliado, a célula do total consolidado fica vazia e um aviso explica o motivo.
- Na Claro/FEBRABAN, gastos por linha usam os resumos tipo `1`. Registros tipo `4` detalham esses valores e não são somados novamente. Resumos sem telefone entram em `Cobranças sem linha`.
- A aba `Multas` recebe apenas cobranças tipo `4` cuja descrição contém `multa` ou `multas`. O valor já integra o total da fatura; a aba serve para destacá-lo, não para adicioná-lo ao total. Quando não há descrição explícita, não se presume multa.
- Registros Vivo sem campos financeiros confirmados permanecem no Excel, mas impedem a apresentação de um total consolidado como se todas as faturas estivessem conciliadas.
- Arquivos com conteúdo binário idêntico são recusados no mesmo lote para evitar duplicação de gastos.

No TXT Claro de referência, os resumos com telefone somam R$ 946,40; o resumo sem telefone soma R$ 423,00; o total da fatura é R$ 1.369,40. Não há cobrança descrita como multa nesse arquivo.
