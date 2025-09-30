export const formatDate = (date: Date | string, locale: string = 'es-CL'): string =>
  new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
