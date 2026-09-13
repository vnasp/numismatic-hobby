export class NumistaError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'NumistaError'
    this.status = status
  }
}

/** HTTP 429: demasiadas peticiones simultáneas o cuota mensual agotada. */
export class NumistaQuotaError extends NumistaError {
  constructor() {
    super('Se agotó la cuota mensual de la API de Numista.', 429)
    this.name = 'NumistaQuotaError'
  }
}

export class NumistaNotFoundError extends NumistaError {
  constructor() {
    super('No se encontró en el catálogo de Numista.', 404)
    this.name = 'NumistaNotFoundError'
  }
}

export class NumistaAuthError extends NumistaError {
  constructor() {
    super('La API key de Numista es inválida o falta.', 401)
    this.name = 'NumistaAuthError'
  }
}
