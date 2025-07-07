# 🔧 Deployment Fix Guide - Supabase Environment Variables

## ❌ Problem
You're getting **500 and 404 errors** because the API can't connect to Supabase database due to missing credentials.

## ✅ Solution
Set up Supabase environment variables in your Vercel dashboard.

---

## 📋 Step-by-Step Fix

### Step 1: Get Supabase Credentials
1. Go to [supabase.com](https://supabase.com)
2. Log into your account and select your project
3. Click **Settings** → **API** in the sidebar
4. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **Service Role Key**: The long string labeled `service_role` (NOT the anon key)

### Step 2: Add Environment Variables to Vercel
1. Go to [vercel.com](https://vercel.com) and log in
2. Find your **Cold Call Tracker** project and click on it
3. Go to **Settings** tab → **Environment Variables**
4. Click **Add New** and add these two variables:

   **Variable 1:**
   ```
   Name: SUPABASE_URL
   Value: [Your Supabase Project URL]
   Environment: Production ✅
   ```

   **Variable 2:**
   ```
   Name: SUPABASE_KEY
   Value: [Your Supabase Service Role Key]
   Environment: Production ✅
   ```

### Step 3: Redeploy Your Application
```bash
vercel --prod
```

---

## 🧪 Testing After Fix

Once deployed, test these endpoints to verify the fix:

1. **Health Check**: Your-App-URL/api/health
   - Should return: `{"status": "ok"}`

2. **Debug Info**: Your-App-URL/api/debug
   - Should show: `"supabase_url_set": true, "supabase_key_set": true`

3. **Businesses API**: Your-App-URL/api/businesses
   - Should return a list of businesses (or empty array if none exist)

---

## 🎯 Your Current App URL
**https://cold-call-tracker-cibhtuldf-debojyoti-biswas-projects.vercel.app**

## 📱 Expected Workflow After Fix
1. ✅ App loads without errors
2. ✅ You can navigate to Business Lookup page
3. ✅ JSON upload functionality works
4. ✅ Your Google Places dataset can be uploaded successfully

---

## ⚠️ Important Notes

- **Use the Service Role Key**, not the anon key (anon key is for frontend, service role is for backend)
- **Environment variables are case-sensitive** - use exact names: `SUPABASE_URL` and `SUPABASE_KEY`
- **After adding variables**, you MUST redeploy for them to take effect
- **Keep your Service Role Key secret** - never share it publicly

---

## 🆘 If Still Having Issues

Check these common problems:

1. **Wrong Key Type**: Make sure you're using the `service_role` key, not `anon` key
2. **Typos**: Verify the environment variable names are exactly: `SUPABASE_URL` and `SUPABASE_KEY`
3. **Not Redeployed**: Environment variables only take effect after redeployment
4. **Supabase Project**: Make sure your Supabase project is active and not paused

## 🚀 What Happens After Fix

Once the environment variables are set correctly:
- ✅ 500/404 errors will disappear
- ✅ JSON upload will work perfectly
- ✅ You can upload your Google Places dataset with 101 businesses
- ✅ Cold calling workflow will be fully functional

The fix is simple but critical - your app is 100% ready except for these missing credentials! 