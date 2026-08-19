export type HomeSummaries = {
  jobs: { active: number; interview: number; href: string };
  sales: { available: number; sold: number; href: string };
  travel: { pending: number; ready: number; href: string };
} | null;

export function tallyTravel(folders: { status: string | null }[]): { pending: number; ready: number } {
  let pending = 0;
  let ready = 0;
  for (const folder of folders) {
    if (folder.status === null || folder.status === "pending") pending += 1;
    else if (folder.status === "ready") ready += 1;
  }
  return { pending, ready };
}

export function tallySales(folders: { status: string | null }[]): { available: number; sold: number } {
  let available = 0;
  let sold = 0;
  for (const folder of folders) {
    if (folder.status === null || folder.status === "available") available += 1;
    else if (folder.status === "sold") sold += 1;
  }
  return { available, sold };
}

export function tallyJobs(links: { status: string | null }[]): { active: number; interview: number } {
  let active = 0;
  let interview = 0;
  for (const link of links) {
    if (
      link.status === null ||
      link.status === "saved" ||
      link.status === "applied" ||
      link.status === "interview"
    ) {
      active += 1;
    }
    if (link.status === "interview") interview += 1;
  }
  return { active, interview };
}
