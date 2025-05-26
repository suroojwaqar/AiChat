'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const { data: session, status } = useSession()

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AI Chat Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience intelligent conversations with project-based context. 
            Upload documents, create projects, and chat with AI that understands your specific needs.
          </p>
        </div>

        {status === 'loading' ? (
          <div className="flex justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : session ? (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back, {session.user.name || session.user.email}!</CardTitle>
                <CardDescription>
                  Ready to continue your AI-powered conversations?
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="flex-1">
                  <Link href="/chat">Go to Chat</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="flex-1">
                  <Link href="/projects">Manage Projects</Link>
                </Button>
                {session.user.role === 'admin' && (
                  <Button asChild size="lg" variant="secondary" className="flex-1">
                    <Link href="/admin">Admin Panel</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>
                  Sign in or create an account to start using the AI Chat Platform
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Button asChild size="lg">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/auth/signup">Create Account</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🤖 Smart AI Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Powered by OpenAI's latest models with streaming responses and context awareness
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📁 Project Context</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organize chats by project and upload documents for AI to reference
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔒 Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your data is encrypted and protected with enterprise-grade security
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
