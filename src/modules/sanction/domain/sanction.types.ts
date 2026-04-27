export interface Sanction {
  id: string;
  condominiumId: string;
  name: string;
  article: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSanctionRequest {
  condominiumId: string;
  name: string;
  article: string | null;
}

export interface UpdateSanctionRequest {
  id: string;
  condominiumId: string;
  name: string;
  article: string | null;
}

export interface SanctionRepository {
  findAll(condominiumId: string): Promise<Sanction[]>;
  findById(id: string, condominiumId: string): Promise<Sanction | null>;
  create(data: CreateSanctionRequest): Promise<Sanction>;
  update(data: UpdateSanctionRequest): Promise<Sanction>;
  delete(id: string, condominiumId: string): Promise<void>;
}
