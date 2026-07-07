import type { UseCase } from "@/shared/application/use-case";

import type { PrivateAreaActionPageData } from "../domain/private-area-action-page-data";
import type { PrivateAreaActionPageDataRepository } from "../domain/private-area-action-page-data.repository";

export interface GetPrivateAreaActionPageDataInput {
  privateAreaId: string;
  opc: "1" | "2";
}

export interface PrivateAreaActionPageViewData {
  area: PrivateAreaActionPageData;
  visibleChargeLines: PrivateAreaActionPageData["charges"];
  visiblePaymentMovements: PrivateAreaActionPageData["payments"];
  didFallbackToAllCharges: boolean;
}

// opc=1 → Propietario (OWNER), opc=2 → Comercio (COMMERCE) — matches legacy id_opcion_estado_cuenta
function toVisibleChargeLines(
  charges: PrivateAreaActionPageData["charges"],
  opc: "1" | "2",
): { visible: PrivateAreaActionPageData["charges"]; fallback: boolean } {
  const targetResponsibility = opc === "2" ? "COMMERCE" : "OWNER";

  const filtered = charges.filter(
    (charge) => charge.responsibility === targetResponsibility,
  );

  return { visible: filtered, fallback: false };
}

function toVisiblePaymentMovements(
  payments: PrivateAreaActionPageData["payments"],
  opc: "1" | "2",
): PrivateAreaActionPageData["payments"] {
  const targetResponsibility = opc === "2" ? "COMMERCE" : "OWNER";
  return payments.filter((payment) => payment.responsibility === targetResponsibility);
}

export class GetPrivateAreaActionPageDataUseCase
  implements
    UseCase<GetPrivateAreaActionPageDataInput, PrivateAreaActionPageViewData | null>
{
  constructor(private readonly repository: PrivateAreaActionPageDataRepository) {}

  async execute(
    input: GetPrivateAreaActionPageDataInput,
  ): Promise<PrivateAreaActionPageViewData | null> {
    if (!input.privateAreaId.trim()) {
      return null;
    }

    const area = await this.repository.getById(input.privateAreaId);

    if (!area) {
      return null;
    }

    const chargeLinesResult = toVisibleChargeLines(area.charges, input.opc);
    const paymentMovements = toVisiblePaymentMovements(
      area.payments,
      input.opc,
    );

    return {
      area,
      visibleChargeLines: chargeLinesResult.visible,
      visiblePaymentMovements: paymentMovements,
      didFallbackToAllCharges: chargeLinesResult.fallback,
    };
  }
}
