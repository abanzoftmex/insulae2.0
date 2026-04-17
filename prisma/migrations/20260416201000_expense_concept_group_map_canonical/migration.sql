-- Canonical mapping table for expense concept -> budget group classification.
-- Runtime reads from Neon only (no legacy file dependency).

CREATE TABLE IF NOT EXISTS expense_concept_group_map (
    id BIGSERIAL PRIMARY KEY,
    condominium_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    legacy_budget_concept_id INTEGER NOT NULL,
    budget_group_id INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'legacy_etl',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

UPDATE expense_concept_group_map
SET source = 'legacy_etl'
WHERE source IS NULL;

UPDATE expense_concept_group_map
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE expense_concept_group_map
SET updated_at = NOW()
WHERE updated_at IS NULL;

ALTER TABLE expense_concept_group_map
    ALTER COLUMN source SET DEFAULT 'legacy_etl',
    ALTER COLUMN source SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS expense_concept_group_map_cond_year_concept_key
    ON expense_concept_group_map (condominium_id, year, legacy_budget_concept_id);

CREATE INDEX IF NOT EXISTS expense_concept_group_map_year_concept_idx
    ON expense_concept_group_map (year, legacy_budget_concept_id);

CREATE INDEX IF NOT EXISTS expense_concept_group_map_cond_year_group_idx
    ON expense_concept_group_map (condominium_id, year, budget_group_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expense_concept_group_map_condominium_id_fkey'
  ) THEN
    ALTER TABLE expense_concept_group_map
      ADD CONSTRAINT expense_concept_group_map_condominium_id_fkey
      FOREIGN KEY (condominium_id) REFERENCES "Condominium"(id)
      ON DELETE RESTRICT ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expense_concept_group_map_condominium_id_year_fkey'
  ) THEN
    ALTER TABLE expense_concept_group_map
      ADD CONSTRAINT expense_concept_group_map_condominium_id_year_fkey
      FOREIGN KEY (condominium_id, year) REFERENCES "Budget"("condominiumId", year)
      ON DELETE RESTRICT ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;
