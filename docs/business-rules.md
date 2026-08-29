# Regras de negócio

## Períodos financeiros futuros

Salários, assinaturas, pagamentos recorrentes e parcelamentos devem prever saldos futuros e faturas visíveis a partir das regras de agendamento. Uma ocorrência futura é uma previsão calculada; nunca uma `Transaction`, `CreditPurchase` ou outro registro histórico concreto persistido. Materializar um registro concreto somente no dia de pagamento ou em uma recomposição histórica explicitamente solicitada. Pausar, alterar ou excluir uma recorrência deve atualizar imediatamente as previsões posteriores, preservando registros concretos passados. Nunca pré-criar parcelas ou ocorrências recorrentes futuras apenas para exibir meses futuros.

## Rótulos de contas em seletores de transação

Quando um seletor de contas em uma transação apresentar mais de um tipo de conta, cada opção deve começar pelo tipo resumido para evitar ambiguidade. Exemplos: `Poupança Mercado Pago`, `Conta Mercado Pago` e `Conta Nubank`. O rótulo comum da conta fora desses seletores permanece sem esse prefixo.
