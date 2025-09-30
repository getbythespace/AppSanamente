// Limpia todo excepto dígitos y K, y pone DV en mayúscula
export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

// Formatea a 12.345.678-9
export function formatRut(raw: string): string {
  const rut = cleanRut(raw);
  if (rut.length < 2) return rut;

  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}

// Valida RUT chileno con algoritmo del DV
export function isValidRut(input: string): boolean {
  const formatted = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(input) ? input : formatRut(input);
  const [bodyWithDots, dv] = formatted.split('-');
  if (!bodyWithDots || !dv) return false;

  const body = bodyWithDots.replace(/\./g, '');
  let sum = 0;
  let mul = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }

  const rest = 11 - (sum % 11);
  const expectedDV = rest === 11 ? '0' : rest === 10 ? 'K' : String(rest);
  return dv.toUpperCase() === expectedDV;
}
