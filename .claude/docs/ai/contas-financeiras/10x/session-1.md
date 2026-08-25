# 10x Analysis: Organização de contas por instituição

Session 1 | Date: 2026-08-25

## Current Value

A tela reúne contas correntes, poupança, investimentos, dinheiro e cartões. Hoje cada item é plano e carrega somente `name` e `type`; por isso, uma conta corrente e um cartão da mesma instituição aparecem como dois cards independentes com o mesmo título.

Evidências:

- `frontend/src/routes/accounts.tsx`: renderiza todas as contas em uma grade plana.
- `frontend/src/routes/accounts/components/CreateFinancialAccountDialog.tsx`: solicita somente nome, tipo e dados financeiros; não distingue instituição de apelido da conta.
- `backend/src/modules/accounts/infra/elysia/AccountsController.ts`: impede duplicidade apenas pela combinação usuário, nome e tipo.

## The Question

Atrelar várias contas à mesma instituição melhora organização ou prejudica UX?

## Medium Opportunities

### 1. Instituição como agrupador opcional

**What**: Separar a instituição financeira da conta. Uma instituição contém várias contas e cartões; dinheiro físico ou ativos sem custodiante ficam em “Sem instituição”.

**Why 10x**: Espelha o modelo mental real. Usuário pensa “no Mercado Pago tenho conta e cartão”, não em dois produtos desconectados chamados Mercado Pago.

**Impact**: Reduz repetição, melhora leitura patrimonial e abre caminho para integração bancária, importação, logos, consolidação por banco e ação “Adicionar conta” contextual.

**Effort**: Medium

**Score**: 🔥 Must do

## Small Gems

### 1. Grupo visual, não card gigante

**What**: Cabeçalho compacto com logo, instituição, saldo consolidado elegível e quantidade; abaixo, linhas/cards menores para cada produto.

**Why powerful**: Mantém escaneabilidade. Agrupamento vira problema somente se esconder dados em acordeões obrigatórios ou misturar saldo bancário com limite de cartão.

**Effort**: Low após suporte no modelo

**Score**: 🔥 Must do

### 2. Criação contextual

**What**: Manter “Nova conta” global e adicionar “Adicionar conta” dentro do grupo da instituição, já preenchendo o banco.

**Why powerful**: Não penaliza primeiro cadastro; acelera cadastros seguintes.

**Effort**: Low

**Score**: 👍 Strong

## Recommended Priority

### Do Now

1. Tratar instituição como entidade/agrupador opcional, nunca inferida apenas por texto livre.
2. Renomear o campo atual para “Nome da conta” ou “Apelido”, com exemplos como “Principal”, “PJ” e “Cartão Gold”.
3. No cadastro, escolher instituição antes do tipo; oferecer “Sem instituição”.
4. Exibir grupos sempre abertos enquanto houver poucas contas. Adicionar colapso somente quando volume real justificar.

### Do Next

1. Mostrar no cabeçalho somente saldo patrimonial consolidado. Limite e fatura de cartão permanecem no item do cartão.
2. Permitir mover conta entre instituições e criar instituição sem duplicar contas.
3. Preservar filtros por tipo, para quem quer ver somente cartões ou investimentos.

### Explore

1. Catálogo normalizado de instituições com logo, mantendo instituição personalizada para fintechs ou corretoras ausentes.
2. Integração/Open Finance usando a instituição como ponto de conexão.

## UX proposta

```text
Mercado Pago                         R$ 2.500,00 · 2 produtos
  Conta principal     Conta corrente             R$ 2.500,00
  Cartão principal    Cartão de crédito     Fatura R$ 320,00
  + Adicionar conta

Carteira                              R$ 180,00 · 1 produto
  Dinheiro            Dinheiro                      R$ 180,00
```

Evitar:

- transformar a instituição na própria conta;
- obrigar grupo recolhido, adicionando clique para ver saldo;
- somar limite de crédito ao patrimônio;
- agrupar por `name`, pois grafias diferentes criam duplicatas;
- fazer instituição obrigatória para dinheiro ou ativos sem custodiante.

## Questions

### Answered

- **Q**: Agrupar piora a UX? **A**: Não. No estado atual, melhora a UX porque remove duplicidade sem retirar detalhe. Piora somente se o grupo esconder informação ou misturar métricas incompatíveis.
- **Q**: Banco e conta devem ser a mesma entidade? **A**: Não. Instituição é pai organizacional; conta/cartão é unidade transacional.

### Blockers

Nenhum para a decisão conceitual.

## Next Steps

- [ ] Validar nomenclatura “Instituição” versus “Banco” com usuários que usam carteira, corretora e fintech.
- [ ] Prototipar o grupo aberto com 1, 2 e 6 produtos.
- [ ] Definir migração dos nomes atuais para instituição + apelido da conta.
