import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // For now, pass through all requests
  // TODO: Add Supabase auth middleware when configured
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
