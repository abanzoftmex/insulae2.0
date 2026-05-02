import { IRoleRepository } from "../domain/role.repository";
import { CreateRoleRequest, UpdateRoleRequest } from "../domain/role.types";

export class GetRolesUseCase {
  constructor(private repository: IRoleRepository) {}
  async execute(condominiumId: string) {
    return this.repository.findAll(condominiumId);
  }
}

export class GetRoleUseCase {
  constructor(private repository: IRoleRepository) {}
  async execute(id: string, condominiumId: string) {
    return this.repository.findById(id, condominiumId);
  }
}

export class GetModulesUseCase {
  constructor(private repository: IRoleRepository) {}
  async execute() {
    return this.repository.findModules();
  }
}

export class CreateRoleUseCase {
  constructor(private repository: IRoleRepository) {}
  async execute(req: CreateRoleRequest) {
    return this.repository.create(req);
  }
}

export class UpdateRoleUseCase {
  constructor(private repository: IRoleRepository) {}
  async execute(req: UpdateRoleRequest) {
    return this.repository.update(req);
  }
}

export class DeleteRoleUseCase {
  constructor(private repository: IRoleRepository) {}
  async execute(id: string, condominiumId: string) {
    return this.repository.delete(id, condominiumId);
  }
}
