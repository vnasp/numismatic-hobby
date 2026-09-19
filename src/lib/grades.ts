export type GradeCode = 'g' | 'vg' | 'f' | 'vf' | 'xf' | 'au' | 'unc'

/**
 * La escala de Numista. Cada grado se guarda partido en dos:
 *
 * - `short`: la sigla numismática estándar, que es lo que se muestra en la
 *   grilla de la colección (con 200+ fichas, el nombre completo es ruido).
 * - `name`: el nombre en español, que acompaña a la sigla en el formulario y
 *   queda disponible para lectores de pantalla en la ficha.
 */
export const GRADES = [
  { code: 'g', short: 'G', name: 'Bien conservada (baja)' },
  { code: 'vg', short: 'VG', name: 'Bien conservada' },
  { code: 'f', short: 'F', name: 'Muy bien conservada (baja)' },
  { code: 'vf', short: 'VF', name: 'Muy bien conservada' },
  { code: 'xf', short: 'XF', name: 'Extraordinariamente bien conservada' },
  { code: 'au', short: 'AU', name: 'Casi sin circular' },
  { code: 'unc', short: 'UNC', name: 'Sin circular' },
] as const satisfies readonly { code: GradeCode; short: string; name: string }[]

function findGrade(code: GradeCode) {
  return GRADES.find((g) => g.code === code)
}

/** Etiqueta completa: `XF — Extraordinariamente bien conservada`. */
export function gradeLabel(code: GradeCode): string {
  const grade = findGrade(code)
  return grade ? `${grade.short} — ${grade.name}` : code
}

/** Sólo la sigla: `XF`. */
export function gradeShort(code: GradeCode): string {
  return findGrade(code)?.short ?? code.toUpperCase()
}

/** Sólo el nombre en español: `Extraordinariamente bien conservada`. */
export function gradeName(code: GradeCode): string {
  return findGrade(code)?.name ?? code
}
