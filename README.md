# PMTraders Shop Manager Dashboard

A simplified, mobile-friendly dashboard designed for shop managers to handle day-to-day retail operations.

## 🎯 Features

### Core Functionality
- **📊 Dashboard** - Overview of orders, products, and driver stats
- **🛒 Orders Management** - View, filter, and fulfill orders
- **📦 Products Management** - Add, edit, and delete products
- **📈 Stock Management** - Track and update inventory levels
- **🚚 Delivery Queue** - Assign drivers to pending deliveries
- **👥 Drivers Management** - Add, edit, and manage delivery drivers

### Key Highlights
- **Simple UI** - Designed for non-technical users
- **Mobile Responsive** - Works on phones and tablets
- **PMTraders Branding** - Custom orange theme (#f97316)
- **Same Login** - Uses the existing Saleor authentication

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Saleor GraphQL API running on `http://localhost:8000/graphql/`

### Development

```bash
# Navigate to shop-manager directory
cd shop-manager

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:3000**

### Login
Use your staff account credentials (same as Admin Dashboard):
- Email: `admin@example.com`
- Password: `admin`

## 📁 Project Structure

```
shop-manager/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Dashboard home
│   │   ├── layout.tsx         # Root layout
│   │   ├── providers.tsx      # Apollo & Auth providers
│   │   ├── globals.css        # Global styles & theme
│   │   ├── login/             # Login page
│   │   ├── orders/            # Orders list & details
│   │   │   ├── page.tsx
│   │   │   ├── new/           # Create order (POS-style)
│   │   │   └── [id]/          # Order details
│   │   ├── products/          # Products list & edit
│   │   │   ├── page.tsx
│   │   │   ├── new/           # Add product
│   │   │   └── [id]/          # Edit product
│   │   ├── stock/             # Stock management
│   │   ├── delivery/          # Delivery queue
│   │   └── drivers/           # Drivers management
│   ├── components/
│   │   └── layout/
│   │       └── Sidebar.tsx    # Navigation sidebar
│   └── lib/
│       ├── apollo-client.tsx  # Apollo Client setup
│       ├── auth.tsx           # Authentication context
│       └── graphql.ts         # GraphQL queries/mutations
├── Dockerfile                  # Production Docker build
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
└── package.json
```

## 🎨 Theme

The dashboard uses PMTraders orange theme:

| Color | Value |
|-------|-------|
| Primary 500 | `#f97316` |
| Primary 600 | `#ea580c` |
| Secondary 50 | `#f8fafc` |
| Secondary 900 | `#0f172a` |

## 🐳 Docker Deployment

### Build the image
```bash
docker build -t pmtraders-shop-manager .
```

### Run with docker-compose
The `docker-compose.yml` in `pmtraders_docker/` includes the shop-manager service:

```yaml
shop-manager:
  build:
    context: ../shop-manager
    dockerfile: Dockerfile
  image: ghcr.io/shashindae/pmtraders-shop-manager:latest
  ports:
    - 3001:3000
  restart: unless-stopped
  environment:
    - NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8000/graphql/
```

After deployment, access at **http://localhost:3001**

## 📋 Pages Overview

### Dashboard (`/`)
- Welcome message
- Stats: Total Orders, Pending Orders, Products, Drivers Online
- Quick Actions: View Orders, Add Product, Check Stock, Deliveries
- Recent Orders table

### Orders (`/orders`)
- List all orders with pagination
- Filter by status (Unfulfilled, Fulfilled, Canceled)
- Search by order number
- View order details

### Order Details (`/orders/[id]`)
- Order items with thumbnails
- Customer & shipping info
- Payment status
- **Mark as Fulfilled** button

### Create Order (`/orders/new`)
- POS-style product selection
- Cart with quantity controls
- Customer details form
- Creates a draft order

### Products (`/products`)
- Grid view with thumbnails
- Search products
- Published/Draft status
- Edit & Delete actions

### Add Product (`/products/new`)
- Name, description, category
- Redirects to edit page after creation

### Edit Product (`/products/[id]`)
- Edit basic info
- View/edit stock per variant
- Pricing info display

### Stock (`/stock`)
- All variants with stock levels
- Low stock alerts
- Inline stock editing
- Filter by warehouse

### Delivery (`/delivery`)
- Orders ready for delivery
- Available drivers count
- Assign driver button
- Customer & address info

### Drivers (`/drivers`)
- Grid view of all drivers
- Online/Active status
- Add new driver modal
- Edit/Delete functionality

## 🔐 Authentication

The Shop Manager uses the same JWT authentication as the main Admin Dashboard:

1. User logs in with email/password
2. Token stored in `localStorage`
3. Token sent with every GraphQL request
4. Only staff users can access

## 📝 Notes

- Prices are managed via the full Admin Dashboard
- Product images are uploaded via Admin Dashboard
- Reports feature is planned for Phase 2
- Uses Apollo Client v3.11.8 for GraphQL

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **GraphQL**: Apollo Client
- **Icons**: Lucide React
- **Language**: TypeScript
