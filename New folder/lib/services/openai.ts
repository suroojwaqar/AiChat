import OpenAI from 'openai'
import { decrypt } from '@/lib/encryption'
import AIProviderSettings from '@/models/AIProviderSettings'
import connectDB from '@/lib/mongodb'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

class OpenAIService {
  private client: OpenAI | null = null
  private settings: any = null

  async initialize() {
    console.log('=== Initializing OpenAI Service ===')
    
    if (this.client) {
      console.log('OpenAI client already initialized')
      return
    }

    try {
      await connectDB()
      console.log('Database connected for AI provider lookup')

      // Get settings from database
      this.settings = await AIProviderSettings.findOne({
        provider: 'openai',
        isActive: true
      })

      console.log('AI Provider query result:', this.settings ? 'Found' : 'Not found')

      if (!this.settings) {
        // Check if any OpenAI provider exists (even if inactive)
        const anyOpenAI = await AIProviderSettings.findOne({ provider: 'openai' })
        if (anyOpenAI) {
          throw new Error('OpenAI provider exists but is not active. Please activate it in admin settings.')
        } else {
          throw new Error('No OpenAI provider configured. Please add OpenAI configuration in admin settings.')
        }
      }

      console.log('AI Provider settings found:', {
        provider: this.settings.provider,
        defaultModel: this.settings.defaultModel,
        hasApiKey: !!this.settings.apiKey
      })

      // Check encryption key
      const encryptionKey = process.env.ENCRYPTION_KEY
      if (!encryptionKey || encryptionKey.length !== 32) {
        throw new Error('ENCRYPTION_KEY environment variable must be exactly 32 characters long')
      }

      // Decrypt API key
      let apiKey: string
      try {
        if (!this.settings.apiKey?.encryptedData || !this.settings.apiKey?.iv || !this.settings.apiKey?.authTag) {
          throw new Error('API key data is incomplete. Please reconfigure the OpenAI provider.')
        }

        apiKey = decrypt(
          this.settings.apiKey.encryptedData,
          this.settings.apiKey.iv,
          this.settings.apiKey.authTag
        )
        console.log('API key decrypted successfully. Length:', apiKey.length)

        if (!apiKey.startsWith('sk-')) {
          throw new Error('Invalid OpenAI API key format. Must start with "sk-"')
        }
      } catch (decryptError: any) {
        console.error('Decryption error:', decryptError)
        throw new Error('Failed to decrypt API key. Please reconfigure the OpenAI provider.')
      }

      // Initialize OpenAI client
      this.client = new OpenAI({
        apiKey: apiKey
      })

      console.log('OpenAI client initialized successfully')

      // Test the connection
      try {
        await this.client.models.list()
        console.log('OpenAI API connection test successful')
      } catch (testError: any) {
        console.error('OpenAI API test failed:', testError)
        if (testError.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your API key in admin settings.')
        }
        throw new Error(`OpenAI API connection failed: ${testError.message}`)
      }

    } catch (error: any) {
      console.error('OpenAI service initialization failed:', error)
      this.client = null
      this.settings = null
      throw error
    }
  }

  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ) {
    console.log('=== Chat Completion Called ===')
    console.log('Messages count:', messages.length)
    console.log('Options:', options)

    await this.initialize()

    if (!this.client) {
      throw new Error('OpenAI client not initialized')
    }

    const {
      model = this.settings?.defaultModel || 'gpt-3.5-turbo',
      temperature = this.settings?.defaultTemperature || 0.7,
      maxTokens = this.settings?.defaultMaxTokens || 2000,
      stream = false
    } = options

    console.log('Final parameters:', { model, temperature, maxTokens, stream })

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
        stream
      })

      console.log('OpenAI API call successful')
      return response
    } catch (error: any) {
      console.error('OpenAI API error details:', {
        status: error.status,
        code: error.code,
        message: error.message,
        type: error.type
      })
      
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key configuration.')
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again in a moment.')
      } else if (error.status === 400) {
        throw new Error(`Invalid request to OpenAI: ${error.message}`)
      } else if (error.status === 500) {
        throw new Error('OpenAI service is temporarily unavailable. Please try again later.')
      } else if (error.status === 503) {
        throw new Error('OpenAI service is overloaded. Please try again later.')
      }
      
      throw new Error(`OpenAI API error: ${error.message || 'Unknown error'}`)
    }
  }

  async generateEmbedding(text: string) {
    await this.initialize()

    if (!this.client) {
      throw new Error('OpenAI client not initialized')
    }

    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      })

      return response.data[0].embedding
    } catch (error: any) {
      console.error('OpenAI embedding error:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  // Helper to count tokens (approximate)
  countTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  // Get available models
  async getAvailableModels() {
    if (!this.settings) {
      await this.initialize()
    }

    return this.settings?.models?.filter((m: any) => m.isActive) || []
  }
}

// Export singleton instance
export const openAIService = new OpenAIService()
