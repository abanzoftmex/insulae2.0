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

const COMMERCE_GROUP_KEYWORDS = [
  "comercio",
  "comercial",
  "local",
  "arrend",
  "renta",
];

function isCommerceGroup(name: string, chargeType: string | null): boolean {
  const normalizedName = name.toLowerCase();
  const normalizedType = (chargeType ?? "").toLowerCase();

  return COMMERCE_GROUP_KEYWORDS.some(
    (keyword) => normalizedName.includes(keyword) || normalizedType.includes(keyword),
  );
}

function toVisibleChargeLines(
  charges: PrivateAreaActionPageData["charges"],
  opc: "1" | "2",
): { visible: PrivateAreaActionPageData["charges"]; fallback: boolean } {
  const filtered = charges.filter((charge) => {
    const belongsToCommerce = isCommerceGroup(
      charge.chargeGroupName,
      charge.chargeGroupType,
    );

    if (opc === "1") {
      return belongsToCommerce;
    }

    return !belongsToCommerce;
  });

  if (filtered.length > 0) {
    return { visible: filtered, fallback: false };
  }

  return { visible: charges, fallback: true };
}

function toVisiblePaymentMovements(
  payments: PrivateAreaActionPageData["payments"],
  visibleChargeLines: PrivateAreaActionPageData["charges"],
): PrivateAreaActionPageData["payments"] {
  if (visibleChargeLines.length === 0) {
    return [];
  }

  const visiblePaymentIds = new Set(
    visibleChargeLines
      .map((charge) => charge.id)
      .filter((chargeId) => chargeId.length > 0),
  );

  if (visiblePaymentIds.size === 0) {
    return payments;
  }

  return payments;
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
      chargeLinesResult.visible,
    );

    return {
      area,
      visibleChargeLines: chargeLinesResult.visible,
      visiblePaymentMovements: paymentMovements,
      didFallbackToAllCharges: chargeLinesResult.fallback,
    };
  }
}
