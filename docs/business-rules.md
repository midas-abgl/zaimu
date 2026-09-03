# Regras de negócio

## Períodos financeiros futuros

Salários, assinaturas, pagamentos recorrentes e parcelamentos devem prever saldos futuros e faturas visíveis a partir das regras de agendamento. Uma ocorrência futura é uma previsão calculada; nunca uma `Transaction`, `CreditPurchase` ou outro registro histórico concreto persistido. Materializar um registro concreto somente quando sua data chegar ou em uma recomposição histórica explicitamente solicitada. Cada ocorrência concreta deve manter uma identidade de agenda estável, separada de seus campos editáveis, e sua criação deve ser idempotente. Cada recorrência materializável deve manter um cursor persistente do último dia processado: chamadas repetidas processam somente dias posteriores ao cursor, enquanto qualquer edição da recorrência descarta dias não processados anteriores ao dia da alteração e nunca recalcula o passado sob os novos dados. O próprio dia da edição continua elegível, garantindo que uma ocorrência devida naquele dia ainda seja criada uma única vez. Se o aplicativo ficar indisponível, os dias ainda não processados desde o cursor devem ser materializados uma única vez quando o processamento retornar. Pausar, alterar ou excluir uma recorrência deve atualizar imediatamente as previsões posteriores, preservando registros concretos passados. Nunca pré-criar parcelas ou ocorrências recorrentes futuras apenas para exibir meses futuros.

## Rótulos de contas em seletores de transação

Quando um seletor de contas em uma transação apresentar mais de um tipo de conta, cada opção deve começar pelo tipo resumido para evitar ambiguidade. Exemplos: `Poupança Mercado Pago`, `Conta Mercado Pago` e `Conta Nubank`. O rótulo comum da conta fora desses seletores permanece sem esse prefixo.

## Cashback e contas de recompensas

Cashback de cartão exige uma porcentagem maior que zero e uma conta de destino do tipo pontos/cashback pertencente ao mesmo usuário. Cada compra concreta gera uma recompensa somente na parcela raiz, calculada sobre o valor total da compra. O lançamento guarda um snapshot do destino, valor e rendimento configurados no momento da compra; mudanças posteriores no cartão não reescrevem recompensas históricas. Editar o valor da compra recalcula sua recompensa pela taxa histórica, mover a compra para outro cartão aplica as regras do cartão de destino e excluir a compra remove a recompensa vinculada.

Conta de recompensas guarda saldo na unidade escolhida: pontos ou reais de cashback. Conta de pontos pode declarar opcionalmente uma conversão completa no formato `X pontos = Y reais`; os dois valores devem existir juntos e ser positivos. A conversão serve apenas para exibir equivalente monetário: saldo continua armazenado em pontos. Sem conversão, pontos nunca entram em totais monetários. Cashback em reais entra nesses totais pelo valor nominal.

Rendimento de cashback é opcional e exige taxa positiva mais periodicidade mensal ou anual. Cada recompensa rende de forma composta após períodos completos desde a data da compra, usando o snapshot da regra vigente quando foi criada.
