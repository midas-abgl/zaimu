# Prisma 8 RC query builder migration

## Objective

Replace Prisma 7 and direct Kysely data access with Prisma 8 RC's PostgreSQL SQL query builder without changing the database or HTTP contracts.

## Steps

- [x] Adopt the Prisma 8 contract, runtime, dependency set, and migration graph in `packages/sql`.
- [ ] Rewrite backend queries and remove direct Prisma 7/Kysely artifacts. (In progress.)
- [ ] Add repeatable database integration coverage and update workspace tooling.
- [ ] Validate fresh and legacy database paths, sign the configured database, and set the Prisma 8 `db` ref.

## Decisions

- One branch performs the full cutover; no dual runtime remains.
- PostgreSQL physical names and current controller behavior remain unchanged.
- Better Auth keeps its direct `pg.Pool` adapter; Kysely may remain only as its transitive dependency.
- The configured external database receives only the Prisma 8 contract marker. Schema/data migrations remain forbidden.

## Progress

Fresh Prisma 8 baseline and replayed Prisma 7 schema both verify against contract hash
`7ba8ce9bb6a6d0056a2ed6d434753d6a5b01af68f510a6e41e2ca1f5be22116f`.
