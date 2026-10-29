import type { Metadata } from "next";
import { SuperAdminInsulaeView } from "./superadmin-view";

export const metadata: Metadata = { title: "Superadministrador" };

export default function SuperAdminInsulaePage() {
  return <SuperAdminInsulaeView />;
}
