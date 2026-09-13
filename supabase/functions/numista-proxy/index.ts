import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as api from './numistaApi.ts'
import { readCachedType, writeCachedType } from './cache.ts'
import { NumistaError } from '../../../shared/numista/errors.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autenticado' }, 401)

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // El usuario debe estar autenticado: el proxy no es un endpoint abierto,
  // porque cada llamada puede consumir cuota mensual de la API.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'No autenticado' }, 401)

  try {
    const body = await req.json()

    switch (body.op) {
      case 'searchByKm':
        return json(await api.searchByKm(String(body.km)))

      case 'search':
        return json(await api.search({
          issuer: body.issuer,
          q: body.q,
          year: body.year,
        }))

      case 'getType': {
        const typeId = Number(body.typeId)
        const cached = await readCachedType(db, typeId)
        if (cached) return json({ ...cached, fromCache: true })

        const [type, issues] = await Promise.all([
          api.getType(typeId),
          api.getIssues(typeId),
        ])
        await writeCachedType(db, type, issues)
        return json({ type, issues, fromCache: false })
      }

      default:
        return json({ error: `Operación desconocida: ${body.op}` }, 400)
    }
  } catch (err) {
    if (err instanceof NumistaError) {
      return json({ error: err.message, name: err.name }, err.status ?? 500)
    }
    return json({ error: 'Error inesperado en el proxy' }, 500)
  }
})
