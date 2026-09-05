# Rateio flexível de dívidas

## Objetivo

Permitir que transações, compras, assinaturas e pagamentos recorrentes distribuam seu valor entre várias pessoas por cotas, percentuais ou valores fixos. Cada parcela externa gera um evento independente no livro da pessoa.

## Decisões

- Um rateio usa exclusivamente cotas, percentuais ou valores fixos.
- Titular começa excluído; quando incluído, absorve diferenças de arredondamento e o restante nos modos percentual/fixo.
- Percentuais sem titular somam 100%; valores fixos sem titular somam o total.
- Ocorrências concretas guardam snapshot do rateio da agenda. Previsões nunca alteram o livro.
- Associação legada vira uma cota externa de 100%, preservando saldo.
- Salários, transferências, pagamentos de fatura e lançamentos manuais não ganham rateio.

## Etapas

- [x] Criar cálculo, esquema e migração dos rateios.
- [x] Integrar rateios ao livro, APIs, materialização e sync.
- [ ] Criar editor compartilhado e integrar formulários/resumos.
- [ ] Cobrir domínio, compatibilidade, materialização e UI com testes.
- [ ] Validar pacotes afetados e concluir commits atômicos.

## Estado atual

Modelo, migração, cálculo, APIs, livro bilateral, materialização e sync concluídos.

## Próximo passo

Concluir editor compartilhado, testes de interface e validação final.
