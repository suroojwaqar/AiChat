import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { unauthorizedResponse, forbiddenResponse } from '@/lib/api-response'

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return { user: null, error: unauthorizedResponse('Please sign in to continue') }
  }
  
  return { user: session.user, error: null }
}

export async function requireAuth() {
  const { user, error } = await getAuthenticatedUser()
  
  if (error) {
    throw error
  }
  
  return user!
}

export async function requireAdmin() {
  const user = await requireAuth()
  
  if (user.role !== 'admin') {
    throw forbiddenResponse('Admin access required')
  }
  
  return user
}
