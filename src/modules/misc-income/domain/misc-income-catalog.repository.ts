export interface MiscIncomeConcept {
  id: string;
  name: string;
  chargeGroupId: string | null;
  quotaPeriodStart: Date | null;
  quotaPeriodEnd: Date | null;
  isActive: boolean;
  order: number;
}

export interface SaveMiscIncomeConcept {
  id?: string;
  name: string;
  chargeGroupId: string | null;
  quotaPeriodStart?: Date | null;
  quotaPeriodEnd?: Date | null;
  isActive?: boolean;
  order?: number;
}

export interface MiscIncomeCatalogRepository {
  findAll(condominiumId: string): Promise<MiscIncomeConcept[]>;
  save(condominiumId: string, concepts: SaveMiscIncomeConcept[]): Promise<void>;
  delete(id: string): Promise<void>;
}
