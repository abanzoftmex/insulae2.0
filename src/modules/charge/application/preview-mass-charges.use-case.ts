import {
  IChargeRepository,
  PreviewMassChargeRequest,
  PreviewMassChargeResult,
} from "../domain/mass-charge.types";

export class PreviewMassChargesUseCase {
  constructor(private readonly repository: IChargeRepository) {}

  async execute(req: PreviewMassChargeRequest): Promise<PreviewMassChargeResult> {
    if (!req.condominiumId || !req.chargeGroupId || !req.zone || !req.concept) {
      throw new Error("Missing required parameters for mass charge preview.");
    }
    if (!req.startDay || !req.dueDay) {
      throw new Error("Debe ingresar el día de inicio y el día de vigencia.");
    }
    if (req.months.length === 0) {
      throw new Error("At least one month must be selected.");
    }
    return this.repository.previewMassCharges(req);
  }
}
