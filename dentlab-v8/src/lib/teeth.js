// FDI universal dental numbering system
// Upper-right 18-11, upper-left 21-28
// Lower-left 38-31, lower-right 41-48

export const TEETH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const TEETH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const toothKind = (n) => {
  const u = n % 10;
  if (u === 1 || u === 2) return 'incisor';
  if (u === 3) return 'canine';
  if (u === 4 || u === 5) return 'premolar';
  return 'molar';
};

export const isUpperTooth = (n) => {
  const q = Math.floor(n / 10);
  return q === 1 || q === 2;
};
