import type {
  DirectoryContactParticipation,
  DirectoryContactUpdatePayload,
  DirectoryFilters,
  DirectoryOverview,
  DirectoryRoleOption,
} from "./directory";

export interface DirectoryRepository {
  getDirectory(filters: DirectoryFilters): Promise<DirectoryOverview | null>;
  getContactParticipation(reference: string): Promise<DirectoryContactParticipation | null>;
  getRoles(): Promise<DirectoryRoleOption[]>;
  updateContact(id: string, data: DirectoryContactUpdatePayload): Promise<{ idVq: string | null }>;
}
