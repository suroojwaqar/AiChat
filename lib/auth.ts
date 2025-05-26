import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please provide both email and password')
        }

        try {
          await connectDB()
          
          const user = await User.findOne({ 
            email: credentials.email.toLowerCase(),
            authProvider: 'credentials'
          })

          if (!user) {
            throw new Error('Invalid email or password')
          }

          if (!user.isActive) {
            throw new Error('Account has been deactivated. Please contact support.')
          }

          const isPasswordValid = await user.comparePassword(credentials.password)

          if (!isPasswordValid) {
            throw new Error('Invalid email or password')
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image
          }
        } catch (error: any) {
          console.error('Authorization error:', error)
          throw new Error(error.message || 'Authentication failed')
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          await connectDB()
          
          const existingUser = await User.findOne({
            $or: [
              { email: user.email, authProvider: 'google' },
              { googleId: account.providerAccountId }
            ]
          })

          if (!existingUser) {
            // Create new user
            const newUser = await User.create({
              email: user.email,
              name: user.name || profile?.name || 'Google User',
              authProvider: 'google',
              googleId: account.providerAccountId,
              image: user.image || profile?.image,
              role: 'user'
            })
            
            user.id = newUser._id.toString()
            user.role = newUser.role
          } else {
            // Update existing user
            if (!existingUser.isActive) {
              return false // Reject sign in
            }
            
            existingUser.image = user.image || profile?.image || existingUser.image
            existingUser.name = user.name || profile?.name || existingUser.name
            await existingUser.save()
            
            user.id = existingUser._id.toString()
            user.role = existingUser.role
          }
          
          return true
        } catch (error) {
          console.error('Google sign in error:', error)
          return false
        }
      }
      
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to /chat after successful login
      if (url === baseUrl || url === `${baseUrl}/` || url.includes('auth/signin')) {
        return `${baseUrl}/chat`
      }
      // Allow callback URLs on the same origin
      if (url.startsWith(baseUrl)) {
        return url
      }
      return `${baseUrl}/chat`
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
