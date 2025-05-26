import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IProject extends Document {
  title: string
  description: string
  owner: Types.ObjectId
  contributors: Types.ObjectId[]
  isPublic: boolean
  settings: {
    maxTokens?: number
    temperature?: number
    model?: string
  }
  createdAt: Date
  updatedAt: Date
}

const projectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    contributors: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    isPublic: {
      type: Boolean,
      default: false
    },
    settings: {
      maxTokens: {
        type: Number,
        default: 2000,
        min: [100, 'Max tokens must be at least 100'],
        max: [4000, 'Max tokens cannot exceed 4000']
      },
      temperature: {
        type: Number,
        default: 0.7,
        min: [0, 'Temperature must be at least 0'],
        max: [2, 'Temperature cannot exceed 2']
      },
      model: {
        type: String,
        default: 'gpt-3.5-turbo'
      }
    }
  },
  {
    timestamps: true
  }
)

// Indexes
projectSchema.index({ owner: 1, createdAt: -1 })
projectSchema.index({ contributors: 1 })
projectSchema.index({ isPublic: 1 })
projectSchema.index({ title: 'text', description: 'text' })

// Virtual for checking if user has access
projectSchema.methods.hasAccess = function(userId: string | Types.ObjectId): boolean {
  const userIdStr = userId.toString()
  return (
    this.isPublic ||
    this.owner.toString() === userIdStr ||
    this.contributors.some((contributorId: Types.ObjectId) => 
      contributorId.toString() === userIdStr
    )
  )
}

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema)

export default Project
