//qui vengono salvati i tipi di materiale

export const MATERIAL_TYPES = [
    "stampante",
    "nas"
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];
