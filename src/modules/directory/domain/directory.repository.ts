import type {
  DirectoryContactParticipation,
  DirectoryFilters,
  DirectoryOverview,
} from "./directory";

export interface DirectoryRepository {
  getDirectory(filters: DirectoryFilters): Promise<DirectoryOverview | null>;
  getContactParticipation(reference: string): Promise<DirectoryContactParticipation | null>;
  getRoles(): Promise<Array<{ id: string; name: string }>>;
  updateContact(id: string, data: Partial<DirectoryContactParticipation>): Promise<void>;
}
