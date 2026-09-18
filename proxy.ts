import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/personas') ||
      request.nextUrl.pathname.startsWith('/espacios') ||
      request.nextUrl.pathname.startsWith('/reservas') ||
      request.nextUrl.pathname.startsWith('/cobros') ||
      request.nextUrl.pathname.startsWith('/accesos') ||
      request.nextUrl.pathname.startsWith('/caja') ||
      request.nextUrl.pathname.startsWith('/abonos') ||
      request.nextUrl.pathname.startsWith('/planes') ||
      request.nextUrl.pathname.startsWith('/carnets') ||
      request.nextUrl.pathname.startsWith('/socios-pendientes') ||
      request.nextUrl.pathname.startsWith('/kiosco')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  // Protect portal routes
  if (request.nextUrl.pathname.startsWith('/portal') &&
      !request.nextUrl.pathname.startsWith('/portal/login') &&
      !request.nextUrl.pathname.startsWith('/portal/registro')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|login|portal/login|portal/registro|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}