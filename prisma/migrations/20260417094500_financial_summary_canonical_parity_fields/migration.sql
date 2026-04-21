-- Preserve legacy charge status semantics in canonical Charge rows.
ALTER TABLE "Charge"
ADD COLUMN "legacyStatusCode" INTEGER;

CREATE INDEX "Charge_condominiumId_legacyStatusCode_idx"
ON "Charge"("condominiumId", "legacyStatusCode");

-- Persist budget concept active flag in canonical concept-group mapping.
ALTER TABLE "expense_concept_group_map"
ADD COLUMN "is_budget_concept_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "expense_concept_group_map_condominium_id_year_is_budget_concept_active_idx"
ON "expense_concept_group_map"("condominium_id", "year", "is_budget_concept_active");
