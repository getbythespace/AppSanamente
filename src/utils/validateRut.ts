export function isValidRut(rut: string): boolean {
  rut = rut.replace(/^0+|[^0-9kK]+/g, '').toUpperCase();
  if (rut.length < 8) return false;
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += +body[i] * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  let expected = 11 - (sum % 11);
  let expectedDV = expected === 11 ? '0' : expected === 10 ? 'K' : expected.toString();
  return dv === expectedDV;
}