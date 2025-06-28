# Flash-Audit Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare your production environment variables

## Step 1: Prepare Environment Variables

Before deploying, you need to set up the following environment variables in your Vercel project settings:

### Required Environment Variables

```bash
# Frontend Variables (VITE_ prefix required)
VITE_API_BASE_URL=https://your-vercel-app.vercel.app
VITE_APP_NAME=FlashAudit
VITE_APP_VERSION=2.0.0
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key

# Backend Variables
NODE_ENV=production
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key

# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-3010990c3182e869153e60225199f259e307e002db4f0da9aec7f502125c7ac
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY_KIMI=sk-or-v1-3010990c3182e869153e60225199f259e307e002db4f0da9aec7f502125c7ac
KIMI_MODEL=moonshotai/kimi-dev-72b:free
OPENROUTER_API_KEY_GEMMA=sk-or-v1-3010990c3182e869153e60225199f259e307e002db4f0da9aec7f502125c7ac
GEMMA_MODEL=google/gemma-3n-e4b-it:free

# Security
JWT_SECRET=your-super-secure-jwt-secret-for-production
SITE_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from project root:
```bash
vercel
```

4. Follow the prompts:
   - Link to existing project or create new one
   - Set project name: `flash-audit`
   - Choose settings (use defaults)

### Option B: Deploy via GitHub Integration

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm run install:all`

## Step 3: Configure Environment Variables in Vercel

1. Go to your project dashboard on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add all the environment variables listed above
4. Make sure to set the correct environment (Production, Preview, Development)

## Step 4: Configure Custom Domains (Optional)

1. In your Vercel project settings, go to **Domains**
2. Add your custom domain
3. Update the following environment variables with your domain:
   - `VITE_API_BASE_URL`
   - `SITE_URL`
   - `CORS_ORIGIN`

## Step 5: Set up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL from `frontend/SETUP_INSTRUCTIONS.md` to create tables
3. Update environment variables with your Supabase credentials

## Step 6: Set up Clerk Authentication

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Configure JWT template for Supabase integration
3. Update environment variables with Clerk keys

## Step 7: Test Deployment

1. Visit your deployed application
2. Test the health endpoint: `https://your-app.vercel.app/health`
3. Test the audit functionality
4. Check browser console for any errors

## API Endpoints

Your deployed application will have these endpoints:

- `GET /health` - Health check
- `POST /api/audit` - Contract audit
- `POST /api/audit/contract` - Detailed contract analysis

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are installed
   - Verify environment variables are set
   - Check build logs in Vercel dashboard

2. **API Errors**:
   - Verify OpenRouter API keys are correct
   - Check Supabase connection
   - Review function logs in Vercel

3. **CORS Issues**:
   - Ensure `CORS_ORIGIN` matches your domain
   - Check that API functions include CORS headers

4. **Environment Variable Issues**:
   - Frontend variables must have `VITE_` prefix
   - Redeploy after changing environment variables
   - Check variable names for typos

### Monitoring

- Use Vercel Analytics for performance monitoring
- Check function logs in Vercel dashboard
- Monitor API usage and errors

## Security Considerations

1. **API Keys**: Never expose API keys in frontend code
2. **CORS**: Configure CORS properly for production
3. **Rate Limiting**: Consider implementing rate limiting for API endpoints
4. **Authentication**: Ensure Clerk authentication is properly configured

## Performance Optimization

1. **Caching**: Vercel automatically caches static assets
2. **Edge Functions**: Consider using Vercel Edge Functions for better performance
3. **Bundle Size**: Monitor and optimize frontend bundle size
4. **API Response Time**: Monitor API function execution time

## Maintenance

1. **Updates**: Regularly update dependencies
2. **Monitoring**: Set up alerts for API failures
3. **Backups**: Ensure Supabase data is backed up
4. **Security**: Regularly rotate API keys and secrets
