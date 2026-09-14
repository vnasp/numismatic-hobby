/**
 * Traduce errores de Postgres/PostgREST (identificados por su código SQLSTATE
 * en `error.code`, estable entre versiones) a mensajes en español. El
 * `message` de Postgres (en inglés, con nombres de tablas y columnas
 * internos) nunca debe llegar a la usuaria.
 */

export const SESSION_EXPIRED_MESSAGE =
  'Tu sesión expiró. Inicia sesión nuevamente y guarda de nuevo: lo que escribiste no se pierde.'

export interface PostgresErrorLike {
  code?: string
  message?: string
}

export function mapPostgresError(
  error: PostgresErrorLike,
  options: { codes?: Record<string, string>; fallback: string },
): string {
  // 42501 = insufficient_privilege: la política RLS rechazó la operación.
  // En la práctica, esto ocurre cuando la sesión expiró mientras la usuaria
  // tenía la pantalla abierta.
  if (error.code === '42501') return SESSION_EXPIRED_MESSAGE

  const specific = error.code ? options.codes?.[error.code] : undefined
  return specific ?? options.fallback
}
