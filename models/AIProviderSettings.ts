import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IAIProviderSettings extends Document {
  provider: 'openai' | 'anthropic' | 'custom'
  apiKey: {
    encryptedData: string
    iv: string
    authTag: string
  }
  models: {
    name: string
    displayName: string
    maxTokens: number
    isActive: boolean
  }[]
  defaultModel: string
  defaultTemperature: number
  defaultMaxTokens: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const aiProviderSettingsSchema = new Schema<IAIProviderSettings>(
  {
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'custom'],
      required: true,
      unique: true
    },
    apiKey: {
      encryptedData: {
        type: String,
        required: true
      },
      iv: {
        type: String,
        required: true
      },
      authTag: {
        type: String,
        required: true
      }
    },
    models: [{
      name: {
        type: String,
        required: true
      },
      displayName: {
        type: String,
        required: true
      },
      maxTokens: {
        type: Number,
        required: true
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    defaultModel: {
      type: String,
      required: true
    },
    defaultTemperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2
    },
    defaultMaxTokens: {
      type: Number,
      default: 2000,
      min: 100,
      max: 4000
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

// Index
aiProviderSettingsSchema.index({ provider: 1, isActive: 1 })

const AIProviderSettings: Model<IAIProviderSettings> = 
  mongoose.models.AIProviderSettings || 
  mongoose.model<IAIProviderSettings>('AIProviderSettings', aiProviderSettingsSchema)

export default AIProviderSettings
