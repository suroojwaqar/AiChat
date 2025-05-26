'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'

const errorMessages = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
  CredentialsSignin: 'Invalid email or password. Please check your credentials and try again.',
  CallbackError: 'There was an error with the authentication callback.',
  SessionRequired: 'You must be signed in to access this page.',
  AccountNotLinked: 'This account is not linked. Please sign in with the original method.',
  OAuthSignin: 'There was an error signing in with the OAuth provider.',
  OAuthCallback: 'There was an error with the OAuth callback.',
  EmailCreateAccount: 'Could not create an account with this email.',
  Callback: 'There was an error with the authentication callback.',
  OAuthCreateAccount: 'Could not create an account with the OAuth provider.',
  EmailSignin: 'There was an error sending the email.',
  CredentialsSignUp: 'There was an error creating your account. Please try again.',
  Signin: 'There was an error signing you in.',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string>('')
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
    }
  }, [searchParams])

  const getErrorMessage = (errorCode: string) => {
    return errorMessages[errorCode as keyof typeof errorMessages] || errorMessages.Default
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      router.push('/auth/signin')
    } catch (error) {
      console.error('Error during retry:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  const getErrorIcon = () => {
    return <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
  }

  const getErrorTitle = (errorCode: string) => {
    switch (errorCode) {
      case 'AccessDenied':
        return 'Access Denied'
      case 'Configuration':
        return 'Configuration Error'
      case 'Verification':
        return 'Verification Failed'
      case 'CredentialsSignin':
        return 'Invalid Credentials'
      case 'SessionRequired':
        return 'Session Required'
      default:
        return 'Authentication Error'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {getErrorIcon()}
          <CardTitle className="text-2xl font-bold text-destructive">
            {getErrorTitle(error)}
          </CardTitle>
          <CardDescription className="text-center">
            {getErrorMessage(error)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground text-center">
              Error Code: <code className="font-mono">{error}</code>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>If this problem persists, please contact support.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
