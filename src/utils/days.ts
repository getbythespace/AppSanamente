// Convierte "hoy" (según zona del cliente) a un Date UTC anclado a las 00:00 del día local.
// tzOffsetMin: minutos (p.ej. Chile en invierno suele ser 240 o 180 negativo/positivo según Date.getTimezoneOffset())
export function localDayStartUTC(ref = new Date(), tzOffsetMin = new Date().getTimezoneOffset()) {
  // 1) Calculamos el Y/M/D en horario local del cliente
  const local = new Date(ref.getTime() - tzOffsetMin * 60_000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  // 2) Devolvemos el instante UTC que representa 00:00 del día local
  return new Date(Date.UTC(y, m, d) + tzOffsetMin * 60_000);
}

export function addDays(dateUTC: Date, days: number) {
  return new Date(dateUTC.getTime() + days * 86_400_000);
}

export function toIsoDate(d: Date) {
  // YYYY-MM-DD (útil para graficar/mostrar)
  return d.toISOString().slice(0, 10);
}
