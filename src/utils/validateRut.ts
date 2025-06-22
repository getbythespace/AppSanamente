//Formateo rut
export function formatRut(rut: string): string {
  rut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (rut.length < 2) return rut;
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);
  let formatted = '';
  let i = 0;
  for (let j = body.length - 1; j >= 0; j--) {
    formatted = body[j] + formatted;
    i++;
    if (i % 3 === 0 && j !== 0) formatted = '.' + formatted;
  }
  return `${formatted}-${dv}`;
}

/**
 * Valida un RUT chileno formateado (X.XXX.XXX-Y o XX.XXX.XXX-Y)
 */
export function isValidRut(rut: string): boolean {
  // Debe tener formato X.XXX.XXX-Y o XX.XXX.XXX-Y
  if (!/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(rut)) return false;

  // Separar parte numérica y dígito verificador
  const [body, dv] = rut.replace(/\./g, '').split('-');
  if (!body || !dv) return false;

  // Calcular dígito verificador esperado
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += +body[i] * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  let expected = 11 - (sum % 11);
  let expectedDV = expected === 11 ? '0' : expected === 10 ? 'K' : expected.toString();

  return dv.toUpperCase() === expectedDV;
}