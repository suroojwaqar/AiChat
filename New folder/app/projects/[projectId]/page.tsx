'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProjectSchema, addContributorSchema, type UpdateProjectInput } from '@/lib/validations/project'
import { ArrowLeft, Save, UserPlus, FileText, MessageSquare, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DocumentsTab } from '@/components/documents/documents-tab'

interface Project {
  _id: string
  title: string
  description: string
  owner: {
    _id: string
    name: string
    email: string
  }
  contributors: {
    _id: string
    name: string
    email: string
  }[]
  isPublic: boolean
  settings: {
    maxTokens?: number
    temperature?: number
    model?: string
  }
  createdAt: string
  updatedAt: string
}

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ documentCount: 0, chatCount: 0 })
  const [showAddContributor, setShowAddContributor] = useState(false)
  const [contributorEmail, setContributorEmail] = useState('')
  const [documents, setDocuments] = useState([])

  const form = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
  })

  useEffect(() => {
    fetchProject()
    fetchDocuments()
  }, [params.projectId])

  async function fetchProject() {
    try {
      const response = await fetch(`/api/projects/${params.projectId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/projects')
          return
        }
        throw new Error('Failed to fetch project')
      }

      const data = await response.json()
      setProject(data.data.project)
      setStats(data.data.stats)
      
      // Set form values
      form.reset({
        title: data.data.project.title,
        description: data.data.project.description,
        isPublic: data.data.project.isPublic,
        settings: data.data.project.settings,
      })
    } catch (error) {
      console.error('Failed to fetch project:', error)
      setError('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchDocuments() {
    try {
      const response = await fetch(`/api/projects/${params.projectId}/documents`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.data.documents)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  async function onSubmit(data: UpdateProjectInput) {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${params.projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update project')
        return
      }

      setProject(result.data.project)
      // Show success message (you could add a toast here)
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAddContributor() {
    // TODO: Implement add contributor endpoint
    setShowAddContributor(false)
    setContributorEmail('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">
              <Settings className="mr-2 h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents ({stats.documentCount})
            </TabsTrigger>
            <TabsTrigger value="activity">
              <MessageSquare className="mr-2 h-4 w-4" />
              Activity ({stats.chatCount} chats)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                  Update your project information and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Public Project</FormLabel>
                            <FormDescription>
                              Allow anyone to view and use this project
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage who has access to this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2">
                    <div>
                      <p className="font-medium">{project.owner.name || project.owner.email}</p>
                      <p className="text-sm text-muted-foreground">{project.owner.email}</p>
                    </div>
                    <Badge>Owner</Badge>
                  </div>
                  
                  {project.contributors.map((contributor) => (
                    <div key={contributor._id} className="flex items-center justify-between p-2">
                      <div>
                        <p className="font-medium">{contributor.name || contributor.email}</p>
                        <p className="text-sm text-muted-foreground">{contributor.email}</p>
                      </div>
                      <Badge variant="secondary">Contributor</Badge>
                    </div>
                  ))}
                </div>

                <Dialog open={showAddContributor} onOpenChange={setShowAddContributor}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Contributor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Contributor</DialogTitle>
                      <DialogDescription>
                        Enter the email address of the person you want to add to this project
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        type="email"
                        placeholder="contributor@example.com"
                        value={contributorEmail}
                        onChange={(e) => setContributorEmail(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddContributor(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddContributor}>
                        Add Contributor
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="pt-6">
                <DocumentsTab
                  projectId={params.projectId}
                  documents={documents}
                  onDocumentAdded={() => {
                    fetchDocuments()
                    fetchProject() // Update stats
                  }}
                  onDocumentDeleted={() => {
                    fetchDocuments()
                    fetchProject() // Update stats
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>
                  Recent chats and activity in this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Activity view coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
