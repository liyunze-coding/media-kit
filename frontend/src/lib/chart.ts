import type { AudienceGender } from "./types";

const PALETTE = ["#06b6d4", "#ec4899", "#8b5cf6", "#71717a", "#f59e0b", "#10b981"];

export function genderColors(genders: AudienceGender[]): Map<string, string> {
  const colors = new Map<string, string>();
  genders.forEach((entry, index) => {
    colors.set(entry.gender, entry.color || PALETTE[index % PALETTE.length]);
  });
  return colors;
}

export function colorFor(colors: Map<string, string>, gender: string): string {
  const existing = colors.get(gender);
  if (existing) return existing;
  const color = PALETTE[colors.size % PALETTE.length];
  colors.set(gender, color);
  return color;
}

export function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}
