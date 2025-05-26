import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  errors?: Record<string, string[]>
}

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

export function errorResponse(
  message: string,
  status = 400,
  errors?: Record<string, string[]>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errors,
    },
    { status }
  )
}

export function validationErrorResponse(error: ZodError): NextResponse<ApiResponse> {
  const errors: Record<string, string[]> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    if (!errors[path]) {
      errors[path] = []
    }
    errors[path].push(err.message)
  })

  return errorResponse('Validation failed', 400, errors)
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<ApiResponse> {
  return errorResponse(message, 401)
}

export function forbiddenResponse(message = 'Forbidden'): NextResponse<ApiResponse> {
  return errorResponse(message, 403)
}

export function notFoundResponse(message = 'Resource not found'): NextResponse<ApiResponse> {
  return errorResponse(message, 404)
}

export function serverErrorResponse(
  error: unknown,
  message = 'Internal server error'
): NextResponse<ApiResponse> {
  console.error('Server error:', error)
  
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    return errorResponse(`${message}: ${error.message}`, 500)
  }
  
  return errorResponse(message, 500)
}
