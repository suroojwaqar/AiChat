# AI Chat Platform — Master Guide

A full-stack AI-powered chat platform built with **Next.js**, **MongoDB**, and **Shadcn UI**, supporting:

- User authentication & chat
- Project-based contextual AI conversations
- Admin dashboard with user/project/api management
- OpenAI API integration with secure key handling

---

## 🧱 Tech Stack

- **Frontend**: Next.js (`app/` router), Tailwind CSS, Shadcn UI
- **Backend**: Next.js API routes
- **Database**: MongoDB (Mongoose)
- **Auth**: `next-auth` (Credentials + Google OAuth)
- **AI API**: OpenAI GPT-4/GPT-3.5 (dynamic config)
- **Embeddings**: OpenAI or custom via HuggingFace
- **Search**: MongoDB Atlas Vector Search (or Pinecone)
- **UI Components**: Shadcn UI (Form, Card, Select, Dialog, etc.)
- **Security**: RBAC, API Key encryption, role-protected routes

---

## 📦 Features

### 🔐 Authentication & RBAC
- NextAuth setup
- Role-based access (`admin`, `user`)
- Google login + credentials support

### 💬 Chat System
- Real-time AI chat (with GPT-4 via OpenAI API)
- Selectable projects for chat context
- Chat history (user and project scoped)
- Streaming responses
- Markdown support

### 📁 Projects
- Create/edit projects
- Add project knowledge base (text or file uploads)
- Shared access for users
- Vector search for document context injection

### 🧠 Knowledge Base Integration
- File uploads (PDF, txt)
- Embedding generation and storage
- Search relevant text via cosine similarity
- Inject knowledge into prompts

### ⚙️ Admin Panel
- Manage users (roles, status)
- Manage projects and documents
- View and delete chats
- Manage API providers and settings
- Securely store and use API keys (encrypted)

---

## 📁 Directory Structure

/app
/chat # Chat UI
/projects # Project management
/admin # Admin panel
/auth # Auth pages
/api # Server-side routes

/components # Shadcn UI components
/models # Mongoose schemas
/lib # DB, encryption, auth utils
/middleware.ts # RBAC protection

/shadcn.config.ts # Shadcn UI config
/tailwind.config.ts # Tailwind styling



---

## 🧩 Mongoose Models

- **User**: email, passwordHash, role, authProvider
- **Project**: title, description, contributors
- **Document**: content, embedding, project
- **Chat**: user, project, messages
- **Message**: role, content, timestamp
- **AIProviderSettings**: provider, apiKey (encrypted), model config

---

## 🔑 API Security & Management

- Admins can add/edit OpenAI API keys
- Models and settings (temp, max tokens) configurable
- Encrypted key storage (e.g., AES or server-side secrets)
