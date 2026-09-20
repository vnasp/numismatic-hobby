import { formatReference } from '../../../shared/numista/references'
import { gradeLabel, type GradeCode } from '../../lib/grades'
import { cartonFor } from '../collection/collectionData'
import { materialOf } from './statsFilter'
import type { CollectionEntry } from '../collection/useCollection'

/**
 * Separador de columnas: punto y coma, no coma.
 *
 * En español el separador decimal es la coma, así que un archivo separado
 * por comas parte "22,5" en dos celdas. Excel en configuración regional
 * española espera punto y coma, y LibreOffice lo detecta solo.
 */
const SEP = ';'

/**
 * Marca de orden de bytes al principio del archivo.
 *
 * Sin ella Excel abre el CSV en la codificación del sistema y los nombres
 * con tilde llegan rotos: "Perú" se convierte en "PerÃº". Es fea pero es la
 * única forma de que el archivo se abra bien con doble clic.
 */
const BOM = '﻿'

const COLUMNS = [
  'Continente',
  'País',
  'Título',
  'Catálogo',
  'Año',
  'Año gregoriano',
  'Ceca',
  'Material',
  'Familia de material',
  'Diámetro (mm)',
  'Cartón',
  'Peso (g)',
  'Conservación',
  'Valoración',
  'Divisa',
  'Fuente de la valoración',
  'Fecha de la valoración',
  'Favorita',
  'Numista tipo',
  'Numista emisión',
]

/** Número en español: 22,5 y no 22.5, para que la celda quede numérica. */
function num(value: number | null): string {
  return value == null ? '' : String(value).replace('.', ',')
}

/**
 * Una celda lista para el archivo.
 *
 * Se entrecomilla siempre que el texto traiga el separador, comillas o un
 * salto de línea, y las comillas de adentro se duplican: es lo que pide el
 * RFC 4180 y lo que evita que un título con punto y coma corra todas las
 * columnas de esa fila.
 */
function cell(value: string | null | undefined): string {
  const text = value ?? ''
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function row(entry: CollectionEntry): string[] {
  return [
    entry.continent ?? '',
    entry.issuerName ?? '',
    entry.title,
    entry.reference ? formatReference(entry.reference) : '',
    entry.issueYear == null ? '' : String(entry.issueYear),
    entry.gregorianYear == null ? '' : String(entry.gregorianYear),
    entry.mintLetter ?? '',
    entry.material ?? '',
    materialOf(entry),
    num(entry.diameterMm),
    cartonFor(entry.diameterMm) ?? '',
    num(entry.weightG),
    entry.grade ? gradeLabel(entry.grade as GradeCode) : '',
    entry.value ? num(entry.value.amount) : '',
    entry.value?.currency ?? '',
    entry.value?.source ?? '',
    entry.value?.at?.slice(0, 10) ?? '',
    entry.isFavorite ? 'Sí' : '',
    String(entry.numistaId),
    entry.numistaIssueId == null ? '' : String(entry.numistaIssueId),
  ]
}

/**
 * La colección entera como CSV, una fila por ejemplar.
 *
 * Va todo lo que la app sabe de cada moneda, incluida la valoración y la
 * ubicación de los datos privados: esto sólo se ofrece con sesión iniciada y
 * la idea es justamente poder trabajar los datos afuera —una planilla, un
 * respaldo, un seguro— sin tener que copiarlos a mano.
 */
export function collectionToCsv(entries: CollectionEntry[]): string {
  const lines = [COLUMNS.map(cell).join(SEP), ...entries.map((entry) => row(entry).map(cell).join(SEP))]
  // Fin de línea de Windows: es lo que el RFC pide y lo que Excel espera.
  return BOM + lines.join('\r\n') + '\r\n'
}

/** `coleccion-2026-09-20.csv` */
export function csvFilename(today = new Date()): string {
  return `coleccion-${today.toISOString().slice(0, 10)}.csv`
}

/** Dispara la descarga en el navegador. */
export function downloadCsv(entries: CollectionEntry[]) {
  const blob = new Blob([collectionToCsv(entries)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = csvFilename()
  link.click()
  // Sin revocar, el blob se queda en memoria hasta que se cierre la pestaña.
  URL.revokeObjectURL(url)
}
