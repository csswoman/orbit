export type StatusOption = { label: string; value: string };

const TRAVEL_FOLDER: StatusOption[] = [
  { value: "pending", label: "Pendiente" },
  { value: "ready", label: "Listo" },
];
const SALES_FOLDER: StatusOption[] = [
  { value: "available", label: "Disponible" },
  { value: "sold", label: "Vendido" },
];
const JOBS: StatusOption[] = [
  { value: "saved", label: "Guardado" },
  { value: "applied", label: "Postulé" },
  { value: "interview", label: "Entrevista" },
  { value: "offer", label: "Oferta" },
  { value: "rejected", label: "Rechazado" },
];

export function statusOptionsFor(spaceKind: string | null, itemKind: string): StatusOption[] {
  if (spaceKind === "travel" && itemKind === "folder") return TRAVEL_FOLDER;
  if (spaceKind === "sales" && itemKind === "folder") return SALES_FOLDER;
  if (spaceKind === "jobs" && (itemKind === "link" || itemKind === "folder")) return JOBS;
  return [];
}

export function showsStatus(spaceKind: string | null, itemKind: string): boolean {
  return statusOptionsFor(spaceKind, itemKind).length > 0;
}
