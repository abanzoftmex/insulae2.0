export interface IncomeRecord {
  id: string;
  date: Date;
  concept: string;
  amount: number;
  paymentMethod: string | null;
  notes: string | null;
  receiptUrl: string | null;
  isActive: boolean;
  isConfirmed: boolean | null;
  miscCatalogId: string | null;
  miscCatalogName: string | null;
  chargeGroupId: string | null;
  chargeGroupName: string | null;
  privateAreaId: string | null;
  privateAreaName: string | null;
}

export interface IncomeListFilter {
  condominiumId: string;
  search?: string;
  miscCatalogId?: string;
  paymentMethod?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SaveIncomeInput {
  id?: string;
  date: Date;
  concept: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  receiptUrl?: string | null;
  miscCatalogId?: string | null;
  chargeGroupId?: string | null;
  privateAreaId?: string | null;
}

export interface IncomeRepository {
  findAll(filter: IncomeListFilter): Promise<IncomeRecord[]>;
  findById(id: string): Promise<IncomeRecord | null>;
  create(condominiumId: string, input: SaveIncomeInput): Promise<IncomeRecord>;
  update(id: string, input: SaveIncomeInput): Promise<IncomeRecord>;
  softDelete(id: string): Promise<void>;
}
