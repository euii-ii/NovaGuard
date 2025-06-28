# Flash-Audit Deployment Guide

## ✅ Successfully Deployed!

Your Flash-Audit application has been deployed to Vercel with both frontend and backend functionality.

**Production URL**: https://novaguard-gflr3vxet-sohomchatterjee07-gmailcoms-projects.vercel.app

## 🔧 Required Environment Variables

To complete the setup, you need to configure the following environment variables in your Vercel dashboard:

### 1. Clerk Authentication
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
```

### 2. Supabase Database
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 3. OpenRouter API (for LLM Analysis)
```
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key_here
```

## 🚀 How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your `novaguard` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable with the values above
5. Redeploy the project

## 🔗 API Endpoints Available

Your backend API is now deployed and includes:

- **Health Check**: `GET /api/health`
- **Contract Analysis**: `POST /api/audit/index`
- **Address Analysis**: `POST /api/audit/address`
- **Audit Results**: `GET /api/audit/results/{auditId}`

All API endpoints require Clerk authentication except the health check.

## 🎯 Features Deployed

### Frontend
- ✅ Landing page with NovaGuard branding
- ✅ React app with Clerk authentication
- ✅ Smart contract audit interface
- ✅ Real-time vulnerability scanning
- ✅ Multi-chain support (Ethereum, Polygon, Sui, Aptos)

### Backend
- ✅ Clerk authentication middleware
- ✅ Supabase database integration
- ✅ OpenRouter LLM integration (Kimi + Gemma models)
- ✅ Smart contract analysis API
- ✅ Serverless functions on Vercel

## 🔐 Authentication Flow

1. Users land on the landing page (`/`)
2. Click "Get Started" to access the main app
3. Clerk handles authentication (sign up/sign in)
4. Authenticated users can access audit features
5. Backend APIs verify Clerk JWT tokens

## 📝 Next Steps

1. **Set up Clerk**: Create a Clerk account and get your keys
2. **Set up Supabase**: Create a Supabase project and get your keys
3. **Set up OpenRouter**: Get an API key for LLM access
4. **Configure environment variables** in Vercel
5. **Test the application** with real authentication

## 🛠️ Development

For local development:
1. Copy `.env.example` to `.env.local`
2. Fill in your environment variables
3. Run `npm run dev` from the root directory

## 🔍 Monitoring

- Check deployment logs in Vercel dashboard
- Monitor API usage in OpenRouter dashboard
- Track user activity in Clerk dashboard
- Monitor database usage in Supabase dashboard

Your Flash-Audit application is now fully deployed with Clerk authentication! 🎉
