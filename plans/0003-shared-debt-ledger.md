# Livro de dívidas pessoal e bilateral

## Objetivo

Transformar dívidas em livro de saldo líquido por pessoa, com contatos locais, vínculos opcionais entre usuários Zaimu e lançamentos derivados de transações ou compras.

## Decisões

- Saldo positivo: pessoa deve ao usuário. Saldo negativo: usuário deve à pessoa.
- Entrada vinculada reduz saldo; saída ou compra aumenta saldo. Excedente cruza zero.
- Compra parcelada afeta dívida uma vez pelo valor total.
- Conta Zaimu exige convite e aceite por e-mail exato verificado.
- Compartilhamento limita-se a valor, data, descrição, tipo e autor.
- Contatos locais funcionam offline; vínculos compartilhados exigem servidor.
- Exclusão de pessoa ou origem manual é local. Exclusão da movimentação financeira criadora remove seu efeito compartilhado.

## Etapas

- [x] Criar esquema, migração e domínio do livro de dívidas.
- [x] Implementar APIs, convites, projeções bilaterais e integrações financeiras.
- [x] Atualizar sync, cache local e contratos frontend.
- [x] Reformular modais, picker, listas e tela de dívidas.
- [ ] Cobrir migração, saldo, privacidade, convites e pareamento com testes.

## Estado atual

Sync e IndexedDB atualizados. Picker reutilizável, associação em transações/compras, pareamento sugerido, convites e tela agrupada por pessoa implementados.

## Próximo passo

Executar validação final dos pacotes afetados e fechar cobertura automatizada.
