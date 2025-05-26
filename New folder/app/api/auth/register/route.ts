import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { signUpSchema } from '@/lib/validations/auth'
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  serverErrorResponse 
} from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = signUpSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const { email, password, name } = validationResult.data

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return errorResponse('An account with this email already exists', 409)
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by the pre-save hook
      name,
      authProvider: 'credentials',
      role: 'user'
    })

    // Return user data without sensitive information
    const userData = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    }

    return successResponse(
      {
        user: userData,
        message: 'Account created successfully. Please sign in.'
      },
      201
    )
  } catch (error) {
    return serverErrorResponse(error, 'Failed to create account')
  }
}
