import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Corre antes de renderizar cada ruta: refresca la sesión de Supabase y
// redirige a login si no hay usuario. Es un chequeo "optimista" (solo mira la
// cookie); la verificación real la hacen las páginas y Server Actions vía lib/auth.

const RUTAS_PUBLICAS = ['/login', '/portal/login', '/portal/registro', '/sin-acceso']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const esPublica = RUTAS_PUBLICAS.some((r) => path === r || path.startsWith(r + '/'))
  const esPortal = path === '/portal' || path.startsWith('/portal/')

  if (!user && !esPublica) {
    const url = request.nextUrl.clone()
    url.pathname = esPortal ? '/portal/login' : '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (user && (path === '/login' || path === '/portal/login')) {
    const url = request.nextUrl.clone()
    url.pathname = path === '/portal/login' ? '/portal' : '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Todo menos assets estáticos y la API (que se protege sola).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
