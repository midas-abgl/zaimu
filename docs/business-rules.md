# Regras de negócio

## Rateio de dívidas

Transações, compras, assinaturas, pagamentos recorrentes e lançamentos manuais podem repartir seu valor entre várias pessoas por um único método: cotas, percentuais ou valores fixos. O titular pode participar; nas divisões por percentuais ou valores fixos, ele sempre absorve diferenças de arredondamento e qualquer restante não distribuído. Percentuais das pessoas não podem ultrapassar 100%, e valores fixos não podem ultrapassar o total. Cada participante externo recebe um evento independente e privado no próprio livro.

Assinaturas e pagamentos recorrentes guardam somente a regra do rateio. Cada ocorrência concreta recebe um snapshot da regra vigente e gera seus eventos; previsões nunca alteram o livro de dívidas. Alterações posteriores na agenda não reescrevem ocorrências passadas. Compras parceladas geram o efeito da dívida somente uma vez, pelo valor total da parcela raiz.

## Períodos financeiros futuros

Salários, assinaturas, pagamentos recorrentes e parcelamentos devem prever saldos futuros e faturas visíveis a partir das regras de agendamento. Uma ocorrência futura é uma previsão calculada; nunca uma `Transaction`, `CreditPurchase` ou outro registro histórico concreto persistido. Materializar um registro concreto somente quando sua data chegar ou em uma recomposição histórica explicitamente solicitada. Cada ocorrência concreta deve manter uma identidade de agenda estável, separada de seus campos editáveis, e sua criação deve ser idempotente. Cada recorrência materializável deve manter um cursor persistente do último dia processado: chamadas repetidas processam somente dias posteriores ao cursor, enquanto qualquer edição da recorrência descarta dias não processados anteriores ao dia da alteração e nunca recalcula o passado sob os novos dados. O próprio dia da edição continua elegível, garantindo que uma ocorrência devida naquele dia ainda seja criada uma única vez. Se o aplicativo ficar indisponível, os dias ainda não processados desde o cursor devem ser materializados uma única vez quando o processamento retornar. Pausar, alterar ou excluir uma recorrência deve atualizar imediatamente as previsões posteriores, preservando registros concretos passados. Nunca pré-criar parcelas ou ocorrências recorrentes futuras apenas para exibir meses futuros.

## Rótulos de contas em seletores de transação

Quando um seletor de contas em uma transação apresentar mais de um tipo de conta, cada opção deve começar pelo tipo resumido para evitar ambiguidade. Exemplos: `Poupança Mercado Pago`, `Conta Mercado Pago` e `Conta Nubank`. O rótulo comum da conta fora desses seletores permanece sem esse prefixo.

## Pagamentos excedentes de fatura

Pagamento de fatura pode exceder o saldo atual e sempre aparece entre as transações da fatura, na ordem cronológica dos lançamentos. Antes do fechamento, pagamentos parciais reduzem o saldo pendente sem marcar a fatura como paga. Qualquer excedente consome cronologicamente os totais das faturas seguintes, mesmo antes do fechamento: a fatura diretamente paga fica zerada, e cada fatura posterior exibe seu saldo negativo após consumir suas próprias compras. Compras lançadas depois recalculam toda a cadeia e reduzem ou puxam de volta o crédito das faturas posteriores. O valor pago nunca deve ser limitado pelo total já lançado, pois compras e reembolsos podem ser preenchidos após o pagamento.

Todo pagamento reduz o limite utilizado. Se os pagamentos superarem o valor total de todas as faturas restantes, somente essa diferença aumenta temporariamente o limite do cartão. Compras posteriores consomem primeiro esse aumento. Esse crédito pago é distinto do valor em garantia do limite: não pode ser sacado nem tratado como saldo disponível em conta.

## Cashback e contas de recompensas

Cartão pode recompensar por percentual de cashback em dinheiro ou por pontos ganhos a cada valor gasto. Ao ativar a recompensa, o sistema cria — ou reutiliza — uma conta sem nome do tipo pontos/cashback na mesma instituição do cartão; não exige seleção manual de destino. Cada compra concreta gera recompensa somente na parcela raiz, calculada sobre o valor total. O lançamento guarda snapshot do destino, valor e rendimento no momento da compra; mudanças posteriores no cartão não reescrevem recompensas históricas. Editar valor da compra recalcula a recompensa pela taxa histórica, mover compra para outro cartão aplica regras do cartão destino e excluir compra remove recompensa vinculada.

Conta de recompensas guarda saldo na unidade escolhida: pontos ou reais de cashback. Conta de pontos pode declarar opcionalmente uma conversão completa no formato `X pontos = Y reais`; os dois valores devem existir juntos e ser positivos. A conversão serve apenas para exibir equivalente monetário: saldo continua armazenado em pontos. Sem conversão, pontos nunca entram em totais monetários. Cashback em reais entra nesses totais pelo valor nominal.

Rendimento de cashback é opcional e exige taxa positiva mais periodicidade mensal ou anual. Cada recompensa rende de forma composta após períodos completos desde a data da compra, usando o snapshot da regra vigente quando foi criada.
