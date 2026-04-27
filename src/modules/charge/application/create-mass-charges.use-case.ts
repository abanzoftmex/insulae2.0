import {
  IChargeRepository,
  CreateMassChargeRequest,
  CreateMassChargeResult,
  PreviewPropertyResult,
} from "../domain/mass-charge.types";

export class CreateMassChargesUseCase {
  constructor(private readonly repository: IChargeRepository) {}

  async execute(req: CreateMassChargeRequest, previewCache: PreviewPropertyResult[]): Promise<CreateMassChargeResult> {
    if (req.selectedPrivateAreaIds.length === 0) {
      throw new Error("Debe seleccionar al menos una propiedad para cargar.");
    }
    return this.repository.createMassCharges(req, previewCache);
  }
}
