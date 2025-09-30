// src/utils/mood.ts
export type MoodBandKey = 'crisis' | 'bajo' | 'neutral' | 'bien' | 'alto';

export const MOOD_BANDS: Record<MoodBandKey, {
  range: string;
  label: string;
  color: string;   // tailwind-ish palette hex
  emoji: string;
  desc: string;
}> = {
  crisis:  { range: '1–2', label: 'Muy bajo',   color: '#ef4444', emoji: '😫', desc: 'crisis / malestar importante, difícil funcionar.' },
  bajo:    { range: '3–4', label: 'Bajo',       color: '#f59e0b', emoji: '😟', desc: 'bajo, cansancio o desánimo marcado.' },
  neutral: { range: '5',   label: 'Neutral',    color: '#9ca3af', emoji: '😐', desc: 'neutro / indiferente.' },
  bien:    { range: '6–7', label: 'Bien',       color: '#22c55e', emoji: '🙂', desc: 'bien, funcional, momentos positivos.' },
  alto:    { range: '8–10',label: 'Muy buen ánimo', color: '#16a34a', emoji: '😄', desc: 'muy buen ánimo/ excepcional para ti (poco frecuente).' },
};

export function moodBand(score?: number | null): MoodBandKey {
  if (score == null) return 'neutral';
  if (score <= 2) return 'crisis';
  if (score <= 4) return 'bajo';
  if (score === 5) return 'neutral';
  if (score <= 7) return 'bien';
  return 'alto';
}

export function moodColor(score?: number | null): string {
  return MOOD_BANDS[moodBand(score)].color;
}

export function moodEmoji(score?: number | null): string {
  return MOOD_BANDS[moodBand(score)].emoji;
}
