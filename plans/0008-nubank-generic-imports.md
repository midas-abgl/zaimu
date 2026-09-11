# Importação Nubank e genérica

## Progresso

- [x] Criar contrato comum, registry e IDs sintéticos versionados.
- [x] Implementar parser Nubank, detecção genérica e fallback textual.
- [x] Expor providers, migration e testes.

## Limitação conhecida

Operações perfeitamente idênticas no mesmo dia usam a ocorrência ordenada. Um recorte que omita parte dessas ocorrências não permite identificar cada uma individualmente.
