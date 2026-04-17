# Hexagonal Modules

Cada módulo sigue la misma estructura:

- `domain`: entidades, reglas y contratos puros.
- `application`: casos de uso.
- `infrastructure`: adapters concretos (Prisma, APIs, storage).
- `presentation`: view-models y mapeo para UI/API.

Primero se estabiliza dominio y migración de datos; después se construyen vistas.
