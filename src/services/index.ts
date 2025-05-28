export * from './db';

export const formatDate = (date: Date | string, locale: string = 'es-CL'): string => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};