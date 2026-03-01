---
**Created:** 2025-12-20 12:26:13
**Last Modified:** 2026-01-29 09:41:58
---
# 🚀 Deploy Shop Manager to Railway

## Prerequisites
- GitHub account with this repo pushed
- Railway account (free tier available at [railway.app](https://railway.app))

---

## Step 1: Prepare the Project

The Shop Manager is already set up for deployment. Just make sure all changes are committed and pushed to GitHub.

```bash
cd shop-manager
git add .
git commit -m "Prepare for Railway deployment"
git push
```

---

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `PMTraders-Main-Git`
5. Railway will ask which directory - select **`shop-manager`**

---

## Step 3: Configure Environment Variables

In Railway dashboard, go to your service → **Variables** tab and add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SALEOR_API_URL` | `https://your-api-domain.com/graphql/` |
| `NODE_ENV` | `production` |

**Important:** Replace `your-api-domain.com` with your actual Saleor API URL.

---

## Step 4: Configure Build Settings

Railway should auto-detect Next.js, but verify these settings:

**In Settings tab:**
- **Root Directory:** `shop-manager`
- **Build Command:** `pnpm install && pnpm build`
- **Start Command:** `pnpm start`

---

## Step 5: Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (2-5 minutes)
3. Once deployed, Railway will give you a URL like `shop-manager-xxxx.up.railway.app`

---

## Step 6: Add Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Click **"Generate Domain"** for a free Railway subdomain
3. Or add your custom domain like `shop.pmtraders.lk`

---

## Alternative: One-Click Deploy with railway.json

Create this file in the `shop-manager` folder:

### `shop-manager/railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

---

## Troubleshooting

### Build Fails?
- Check that `pnpm-lock.yaml` exists in the shop-manager folder
- Or switch to npm: Change build command to `npm install && npm run build`

### API Connection Issues?
- Verify `NEXT_PUBLIC_SALEOR_API_URL` is correct
- Make sure your Saleor API allows CORS from Railway domain

### Port Issues?
Railway automatically sets the `PORT` environment variable. Next.js handles this automatically.

---

## Quick Commands

```bash
# Build locally to test
pnpm build

# Start production server locally
pnpm start

# Check for issues
pnpm lint
```

---

## ⚡ Automated Deployment (Recommended)

Start the full deployment pipeline (Stop -> Build -> Push -> Deploy) with a single command:

```powershell
./redeploy_shop_manager.ps1
```

This script:
1. Stops any local docker instance
2. Builds the image with correct production API args
3. Pushes to GitHub Container Registry
4. Triggers Railway redeployment

---

## Cost

Railway Free Tier includes:
- $5 free credits/month
- Good for small apps
- Upgrade only if needed

---

## Need More Help?

- Railway Docs: https://docs.railway.app
- Next.js Deployment: https://nextjs.org/docs/deployment
