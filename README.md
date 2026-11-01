# Wmarket

<p align="center">
  <img src="docs/storefront.jpg" width="49%" alt="Wmarket Storefront Preview" />
  <img src="docs/dashboard.jpg" width="49%" alt="Wmarket Dashboard Preview" />
</p>

<p align="center">
  <strong>A modern, full-stack multi-vendor e-commerce platform built with an end-to-end TypeScript monorepo.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Author-Wistant-blue?style=flat-square" alt="Author" />
  <img src="https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.3-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Express-5.3-green?style=flat-square&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Turborepo-2.x-EF4444?style=flat-square&logo=turborepo" alt="Turborepo" />
  <img src="https://img.shields.io/badge/pnpm-10.x-F69220?style=flat-square&logo=pnpm" alt="pnpm" />
</p>

---

## 🚀 Overview

**Wmarket** is an all-in-one multi-vendor e-commerce platform engineered for performance, scalability, and a seamless shopping experience. Managed as a unified **Turborepo** monorepo, the project brings together:

- **Customer Storefront (`apps/web`)**: High-performance storefront powered by Next.js 16 (App Router), React 19, and Tailwind CSS v4. Features comprehensive product browsing, dynamic layouts, cart and checkout flows, and Stripe payments.
- **Admin & Vendor Dashboard (`apps/admin`)**: Fast and responsive control center built with React 19 and Vite. Provides dedicated panels for Master Admins and Marketplace Sellers with analytics, catalog management, and order processing.
- **Core Backend API (`apps/api`)**: Robust REST API built on Express 5, TypeScript, and MongoDB. Handles authentication, database operations, business logic, and third-party webhooks.
- **Shared Packages (`packages/*`)**: Centralized TypeScript configurations and ESLint rules shared across the entire workspace for clean and consistent code quality.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Monorepo Engine** | [Turborepo](https://turbo.build/) & [pnpm Workspaces](https://pnpm.io/workspaces) |
| **Storefront** | [Next.js 16](https://nextjs.org/) (App Router, React Compiler), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **Admin Portal** | [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/), Tailwind CSS |
| **Backend & API** | [Node.js](https://nodejs.org/), [Express 5](https://expressjs.com/), [MongoDB](https://www.mongodb.com/) |
| **Language & Tooling** | [TypeScript 6](https://www.typescriptlang.org/) (strict mode), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) |
| **Integrations** | Stripe, ImageKit, Firebase Auth |

---

## 📂 Project Architecture

```text
wistant-market/
├── apps/
│   ├── web/                 # Next.js customer-facing storefront (App Router)
│   ├── admin/               # React + Vite admin & vendor dashboard
│   └── api/                 # Express REST API & MongoDB models
├── packages/
│   ├── typescript-config/   # Shared tsconfig bases (base, nextjs, react)
│   └── eslint-config/       # Shared ESLint rules & configurations
├── docs/                    # Screenshots and documentation assets
├── turbo.json               # Monorepo task pipeline configuration
├── pnpm-workspace.yaml      # Workspace packages definitions
└── package.json             # Root monorepo scripts & dependencies
```

---

## ⚡ Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js**: `>= 22.22.0` (Node 24 LTS recommended)
- **pnpm**: `>= 10.29.3` (`corepack enable` or `npm install -g pnpm@10.29.3`)
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Wistant-market
   ```

2. **Install all workspace dependencies:**
   ```bash
   pnpm install
   ```

3. **Start the development servers:**
   ```bash
   pnpm dev
   ```

This launches all applications concurrently:

| App | Local URL | Role |
|---|---|---|
| **Storefront** | `http://localhost:3000` | Customer shop experience |
| **Dashboard** | `http://localhost:5173` | Admin & Vendor management portal |
| **API** | `http://localhost:8000` | Backend REST endpoints |

---

## 📜 Available Scripts

Run these commands from the root directory:

| Command | Description |
|---|---|
| `pnpm dev` | Starts all apps concurrently in development mode |
| `pnpm dev:web` | Starts only the Next.js storefront |
| `pnpm dev:admin` | Starts only the React + Vite admin dashboard |
| `pnpm dev:api` | Starts only the Express API |
| `pnpm build` | Builds all packages and applications for production |
| `pnpm lint` | Runs ESLint across all workspaces |
| `pnpm check-types` | Executes TypeScript type-checks across all workspaces |
| `pnpm format` | Formats codebase with Prettier (`.ts`, `.tsx`, `.md`) |
| `pnpm seed` | Populates MongoDB with initial store data |
| `pnpm clean` | Cleans build caches, `.next`, `.turbo`, and dist folders |

---

## 🗄️ Database Seeding & Media

Wmarket includes an automated seeding pipeline to initialize demo products, categories, brands, banners, and sample orders:

1. Configure your environment variables in `apps/api/.env`.
2. *(Optional)* Upload seed media assets to your ImageKit storage:
   ```bash
   pnpm --filter @wmarket/api exec tsx scripts/uploadSeedImages.ts
   ```
3. Run the database seed:
   ```bash
   pnpm seed
   ```

---

## 🔐 Environment Configuration

Each application maintains its own `.env` configuration file (ignored by Git):
- `apps/api/.env`: Database URI (MongoDB), JWT secrets, ImageKit credentials, Stripe keys.
- `apps/web/.env`: Public API URLs, public payment keys.
- `apps/admin/.env`: API endpoints, authentication keys.

---

## 👤 Author

**Wistant**
- **Email**: [wistantkode@protonmail.com](mailto:wistantkode@protonmail.com)
- **Project**: Wmarket (Wistant Market)

---

## 📄 License

Private & Proprietary © 2026 Wistant. All rights reserved.
