import type {
  PrivateAreaLegacyAction,
  PrivateAreaLegacyActionContext,
} from "../domain/private-area-legacy-actions";
import type { PrivateAreaLegacyActionsResolver } from "../domain/private-area-legacy-actions.resolver";

const INTERNAL_BASE_PATH = "/areas-privativas";

function buildInternalUrl(pathname: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString();
  return `${INTERNAL_BASE_PATH}/${pathname}?${search}`;
}

export class LegacyPrivateAreaActionsResolver
  implements PrivateAreaLegacyActionsResolver
{
  async resolveForArea(
    context: PrivateAreaLegacyActionContext,
  ): Promise<PrivateAreaLegacyAction[]> {
    const privateAreaId = context.privateAreaId.trim();
    const canNavigate = privateAreaId.length > 0;

    const editBaseUrl = canNavigate
      ? buildInternalUrl("formulario-apol", { id: privateAreaId })
      : null;

    const editImagesUrl = canNavigate
      ? buildInternalUrl("formulario-apol-imagenes", {
          id: privateAreaId,
        })
      : null;

    const ownerPaymentsUrl = canNavigate
      ? buildInternalUrl("listado-pagos", {
          id: privateAreaId,
          opc: "2",
        })
      : null;

    const commercePaymentsUrl = canNavigate
      ? buildInternalUrl("listado-pagos", {
          id: privateAreaId,
          opc: "1",
        })
      : null;

    const rentalsAreEnabled = canNavigate && context.isActive;
    const rentalsUrl = rentalsAreEnabled
      ? buildInternalUrl("listado-arrendamientos", {
          id: privateAreaId,
        })
      : null;

    return [
      {
        id: "EDIT_BASE",
        label: "Editar",
        kind: "icon",
        href: editBaseUrl,
        isEnabled: canNavigate,
      },
      {
        id: "EDIT_IMAGES",
        label: "Imagenes",
        kind: "icon",
        href: editImagesUrl,
        isEnabled: canNavigate,
      },
      {
        id: "OWNER_PAYMENTS",
        label: "Propietario",
        kind: "pill",
        href: ownerPaymentsUrl,
        isEnabled: canNavigate,
      },
      {
        id: "COMMERCE_PAYMENTS",
        label: "Comercio",
        kind: "pill",
        href: commercePaymentsUrl,
        isEnabled: canNavigate,
      },
      {
        id: "RENTALS",
        label: "Arrendamiento",
        kind: "icon",
        href: rentalsUrl,
        isEnabled: rentalsAreEnabled,
      },
    ];
  }
}