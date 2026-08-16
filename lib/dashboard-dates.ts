const TIME_ZONE = "America/Lima";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: TIME_ZONE,
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const monthFormatter = new Intl.DateTimeFormat("es-PE", {
  month: "short",
  timeZone: TIME_ZONE,
});

export function getCalendarParts(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    timeZone: TIME_ZONE,
  }).format(date);
  const month = monthFormatter.format(date).replace(".", "");

  return { day, month };
}

export function getDeadlineTiming(value: string, now = new Date()) {
  const dueDate = new Date(value);
  const differenceMs = dueDate.getTime() - now.getTime();
  const differenceHours = Math.ceil(Math.abs(differenceMs) / 3_600_000);
  const differenceDays = Math.ceil(differenceHours / 24);

  if (differenceMs < 0) {
    return {
      label:
        differenceHours < 24
          ? `Venció hace ${differenceHours} h`
          : `Venció hace ${differenceDays} d`,
      tone: "overdue" as const,
    };
  }

  const todayKey = dateKeyFormatter.format(now);
  const dueKey = dateKeyFormatter.format(dueDate);

  if (todayKey === dueKey) {
    return { label: `Hoy · ${timeFormatter.format(dueDate)}`, tone: "today" as const };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateKeyFormatter.format(tomorrow) === dueKey) {
    return { label: `Mañana · ${timeFormatter.format(dueDate)}`, tone: "soon" as const };
  }

  return {
    label: new Intl.DateTimeFormat("es-PE", {
      day: "numeric",
      month: "short",
      timeZone: TIME_ZONE,
      weekday: "short",
    }).format(dueDate),
    tone: "future" as const,
  };
}

export function getStalenessLabel(value: string, now = new Date()) {
  const viewedAt = new Date(value);
  const days = Math.max(
    0,
    Math.floor((now.getTime() - viewedAt.getTime()) / 86_400_000),
  );

  if (days === 0) return "Visto hoy";
  if (days === 1) return "Sin ver hace 1 día";
  if (days < 30) return `Sin ver hace ${days} días`;

  const months = Math.floor(days / 30);
  if (months === 1) return "Sin ver hace 1 mes";
  if (months < 12) return `Sin ver hace ${months} meses`;

  const years = Math.floor(months / 12);
  return years === 1 ? "Sin ver hace 1 año" : `Sin ver hace ${years} años`;
}
