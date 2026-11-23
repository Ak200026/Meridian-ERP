# Meridian ERP 🏢

> **AI-Powered Enterprise ERP Platform** — Built with Vue 3, Node.js, Express, PostgreSQL

A full-stack ERP application named **Meridian**, designed for learning modern web development and AI integration.

A full-stack ERP application designed for learning modern web development and AI integration.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Composition API) + Pinia + Vue Router |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| AI (Phase 2) | OpenAI, LangChain.js, pgvector |

---

## 📁 Project Structure

```
ERP/
├── frontend/          # Vue 3 SPA
│   ├── src/
│   │   ├── api/       # Axios HTTP client
│   │   ├── components/# Reusable components (Sidebar, Topbar)
│   │   ├── router/    # Vue Router (navigation guards)
│   │   ├── stores/    # Pinia state management
│   │   └── views/     # Page components
│   └── .env
│
└── backend/           # Node.js REST API
    ├── src/
    │   ├── config/    # DB connection + SQL schema
    │   ├── controllers/# Business logic
    │   ├── middleware/ # JWT auth, RBAC
    │   ├── routes/    # API endpoints
    │   └── ai/        # 🤖 AI integration (Phase 2)
    └── .env
```

---

## ⚡ Quick Start

### 1. Setup PostgreSQL Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE bizsuite_erp;"

# Run schema
psql -U postgres -d bizsuite_erp -f backend/src/config/schema.sql

# Seed sample data
psql -U postgres -d bizsuite_erp -f backend/src/config/seed.sql
```

### 2. Start Backend

```bash
cd backend
# Copy and edit .env
cp .env.example .env

npm run dev    # Starts on http://localhost:5000
```

### 3. Start Frontend

```bash
cd frontend
npm run dev    # Starts on http://localhost:5173
```

### 4. Login
- **Admin:** admin@bizsuite.com / password
- **Manager:** sales@bizsuite.com / password  
- **Viewer:** viewer@bizsuite.com / password

---

## 📚 ERP Modules

| Module | Features |
|--------|---------|
| 🏠 Dashboard | KPI stats, recent orders, AI insights, revenue chart |
| 📦 Inventory | Products CRUD, stock tracking, low stock alerts |
| 💰 Sales | Order management, customer database, status tracking |
| 🛒 Purchase | PO management, goods receipt, supplier database |
| ✨ AI Assistant | Chat interface, smart search, AI insights |

---

## 🤖 AI Learning Path (Phase 2)

| Step | Concept | Status |
|------|---------|--------|
| 1 | OpenAI API integration in Node.js | 🔜 Next |
| 2 | Prompt Engineering for ERP context | 🔜 |
| 3 | LangChain.js chains & agents | 🔜 |
| 4 | pgvector embeddings in PostgreSQL | 🔜 |
| 5 | RAG pipeline for ERP data querying | 🔜 |
| 6 | Function Calling for structured outputs | 🔜 |

---

## 🔑 Key Node.js + AI Concepts You'll Learn

- **REST APIs** with Express.js (routes, controllers, middleware)
- **JWT Authentication** + RBAC (Role-Based Access Control)
- **PostgreSQL** queries, transactions, indexes
- **Pinia** state management in Vue 3
- **OpenAI API** — how to call GPT-4 from Node.js
- **LangChain.js** — chaining AI prompts with tools
- **Embeddings** — converting text to vectors
- **pgvector** — semantic search in PostgreSQL
- **RAG** — Retrieval Augmented Generation pipeline

---

*Meridian ERP — Built by Arunkumar R — Learning AI + Node.js through practical ERP development*
