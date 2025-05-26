'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Bot, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Key,
  Activity,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

const aiProviderSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'custom']),
  apiKey: z.string().min(1, 'API key is required'),
  defaultModel: z.string().min(1, 'Default model is required'),
  defaultTemperature: z.number().min(0).max(2),
  defaultMaxTokens: z.number().min(100).max(200000),
  isActive: z.boolean()
})

type AIProviderForm = z.infer<typeof aiProviderSchema>

interface AIProvider {
  _id: string
  provider: 'openai' | 'anthropic' | 'custom'
  apiKey: string
  defaultModel: string
  defaultTemperature: number
  defaultMaxTokens: number
  models: Array<{
    name: string
    displayName: string
    maxTokens: number
    isActive: boolean
  }>
  isActive: boolean
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

export default function AIProvidersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [showApiKey, setShowApiKey] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const form = useForm<AIProviderForm>({
    resolver: zodResolver(aiProviderSchema),
    defaultValues: {
      provider: 'openai',
      apiKey: '',
      defaultModel: '',
      defaultTemperature: 0.7,
      defaultMaxTokens: 2000,
      isActive: true
    }
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user?.role !== 'admin') {
      router.push('/unauthorized')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchProviders()
    }
  }, [session])

  async function fetchProviders() {
    try {
      const response = await fetch('/api/admin/ai-providers')
      if (response.ok) {
        const data = await response.json()
        setProviders(data.data.providers)
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: AIProviderForm) {
    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        await fetchProviders()
        setIsDialogOpen(false)
        form.reset()
        setSelectedProvider(null)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to save provider')
      }
    } catch (error) {
      console.error('Failed to save provider:', error)
      alert('Failed to save provider')
    } finally {
      setActionLoading(false)
    }
  }

  async function deleteProvider(providerId: string) {
    if (!confirm('Are you sure you want to delete this provider?')) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/ai-providers/${providerId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchProviders()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to delete provider')
      }
    } catch (error) {
      console.error('Failed to delete provider:', error)
      alert('Failed to delete provider')
    } finally {
      setActionLoading(false)
    }
  }

  function openCreateDialog() {
    setDialogMode('create')
    setSelectedProvider(null)
    form.reset()
    setIsDialogOpen(true)
  }

  function openEditDialog(provider: AIProvider) {
    setDialogMode('edit')
    setSelectedProvider(provider)
    form.reset({
      provider: provider.provider,
      apiKey: '',
      defaultModel: provider.defaultModel,
      defaultTemperature: provider.defaultTemperature,
      defaultMaxTokens: provider.defaultMaxTokens,
      isActive: provider.isActive
    })
    setIsDialogOpen(true)
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖'
      case 'anthropic':
        return '🧠'
      default:
        return '⚙️'
    }
  }

  const getProviderBadge = (provider: string, isActive: boolean) => {
    const baseClass = isActive ? '' : 'opacity-50'
    switch (provider) {
      case 'openai':
        return <Badge className={`bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 ${baseClass}`}>OpenAI</Badge>
      case 'anthropic':
        return <Badge className={`bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 ${baseClass}`}>Anthropic</Badge>
      default:
        return <Badge className={`bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100 ${baseClass}`}>Custom</Badge>
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge> :
      <Badge variant="secondary">
        <AlertCircle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading AI providers...</div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Bot className="h-8 w-8" />
              AI Provider Settings
            </h1>
            <p className="text-muted-foreground">
              Configure AI providers and manage API keys
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
            <p className="text-xs text-muted-foreground">
              Configured providers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.filter(p => p.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              Currently enabled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Models</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.reduce((total, p) => total + (p.models?.filter(m => m.isActive).length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active AI models
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Providers List */}
      <Card>
        <CardHeader>
          <CardTitle>AI Providers</CardTitle>
          <CardDescription>
            Manage your AI provider configurations and API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No AI Providers Configured</h3>
              <p className="text-muted-foreground mb-4">
                Add your first AI provider to start using the chat functionality
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Provider
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Default Model</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Models</TableHead>
                    <TableHead>Settings</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getProviderIcon(provider.provider)}</span>
                          <div>
                            {getProviderBadge(provider.provider, provider.isActive)}
                            <div className="text-sm text-muted-foreground mt-1 capitalize">
                              {provider.provider} API
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(provider.isActive)}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {provider.defaultModel}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {provider.hasApiKey ? (
                            <>
                              <Key className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600 dark:text-green-400">
                                Configured
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-600 dark:text-red-400">
                                Missing
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{provider.models?.filter(m => m.isActive).length || 0} active</div>
                          <div className="text-muted-foreground">
                            {provider.models?.length || 0} total
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>Temp: {provider.defaultTemperature}</div>
                          <div>Max Tokens: {provider.defaultMaxTokens.toLocaleString()}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(provider)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProvider(provider._id)}
                            disabled={actionLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Add AI Provider' : `Edit ${selectedProvider?.provider} Provider`}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' 
                ? 'Configure a new AI provider for your platform'
                : 'Update your AI provider configuration'
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="openai">🤖 OpenAI</SelectItem>
                            <SelectItem value="anthropic">🧠 Anthropic (Claude)</SelectItem>
                            <SelectItem value="custom">⚙️ Custom Provider</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showApiKey ? 'text' : 'password'}
                              placeholder={dialogMode === 'edit' ? 'Enter new API key to update' : 'Enter your API key'}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowApiKey(!showApiKey)}
                            >
                              {showApiKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          {dialogMode === 'edit' 
                            ? 'Leave empty to keep current API key'
                            : 'Your API key will be encrypted and stored securely'
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Model</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., gpt-4, claude-3-opus-20240229"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The default model to use for new chats
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Provider
                          </FormLabel>
                          <FormDescription>
                            Make this provider available for use
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
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="defaultTemperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Temperature</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Controls randomness (0 = deterministic, 2 = very random)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultMaxTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Max Tokens</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="100"
                            max="200000"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum tokens per response
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : dialogMode === 'create' ? 'Add Provider' : 'Update Provider'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
