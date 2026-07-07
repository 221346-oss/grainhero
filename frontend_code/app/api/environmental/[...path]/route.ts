import { NextRequest, NextResponse } from 'next/server'

/**
 * Environmental Data API Proxy
 * Forwards requests to the backend environmental API
 */
export async function GET(request: NextRequest) {
  try {
    // Extract path from the request URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/api/environmental/')[1];
    const path = pathSegments ? pathSegments.split('/').filter(segment => segment) : [];

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    const joinedPath = path.join('/')
    const searchParams = url.searchParams.toString()
    const fullUrl = `${backendUrl}/api/environmental/${joinedPath}${searchParams ? `?${searchParams}` : ''}`

    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers,
      })
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    } catch {
      const altUrl = fullUrl.replace('http://localhost:5000', 'http://192.168.100.229:5000')
      const response2 = await fetch(altUrl, {
        method: 'GET',
        headers,
      })
      const data2 = await response2.json()
      return NextResponse.json(data2, { status: response2.status })
    }
  } catch (error) {
    console.error('Environmental API proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch environmental data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract path from the request URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/api/environmental/')[1];
    const path = pathSegments ? pathSegments.split('/').filter(segment => segment) : [];

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    const joinedPath = path.join('/')
    const body = await request.json()

    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(`${backendUrl}/api/environmental/${joinedPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Environmental API proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process environmesntal request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
