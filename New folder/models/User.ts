import mongoose, { Schema, Document, Model } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  email: string
  passwordHash?: string
  name: string
  role: 'admin' | 'user'
  authProvider: 'credentials' | 'google'
  googleId?: string
  image?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        },
        message: 'Please enter a valid email address'
      }
    },
    passwordHash: {
      type: String,
      required: function(this: IUser) {
        return this.authProvider === 'credentials'
      }
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user'
    },
    authProvider: {
      type: String,
      enum: ['credentials', 'google'],
      required: true
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true
    },
    image: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) return false
  return bcrypt.compare(candidatePassword, this.passwordHash)
}

// Indexes
userSchema.index({ email: 1 })
userSchema.index({ googleId: 1 })
userSchema.index({ role: 1, isActive: 1 })

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema)

export default User
