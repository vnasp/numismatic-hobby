export type GradeCode = 'g' | 'vg' | 'f' | 'vf' | 'xf' | 'au' | 'unc'

export const GRADES = [
  { code: 'g', label: 'G — Bien conservada (baja)' },
  { code: 'vg', label: 'VG — Bien conservada' },
  { code: 'f', label: 'F — Muy bien conservada (baja)' },
  { code: 'vf', label: 'VF — Muy bien conservada' },
  { code: 'xf', label: 'XF — Extraordinariamente bien conservada' },
  { code: 'au', label: 'AU — Casi sin circular' },
  { code: 'unc', label: 'UNC — Sin circular' },
] as const satisfies readonly { code: GradeCode; label: string }[]

export function gradeLabel(code: GradeCode): string {
  return GRADES.find((g) => g.code === code)?.label ?? code
}
