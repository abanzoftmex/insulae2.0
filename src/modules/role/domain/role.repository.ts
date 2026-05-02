import { Role, ModuleCatalog, CreateRoleRequest, UpdateRoleRequest } from "./role.types";

export interface IRoleRepository {
  findAll(condominiumId: string): Promise<Role[]>;
  findById(id: string, condominiumId: string): Promise<Role | null>;
  findModules(): Promise<ModuleCatalog[]>;
  create(role: CreateRoleRequest): Promise<Role>;
  update(role: UpdateRoleRequest): Promise<Role>;
  delete(id: string, condominiumId: string): Promise<void>;
}
