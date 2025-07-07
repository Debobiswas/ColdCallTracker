# 🔧 Troubleshooting 500/404 Errors

## ❌ Errors You're Seeing
```
Failed to load resource: the server responded with a status of 500
Failed to load resource: the server responded with a status of 404
```

## 🔍 **Step-by-Step Diagnosis**

### **Step 1: Check API Health**
First, let's verify your API is deployed correctly:

**Test this URL in your browser:**
```
https://cold-call-tracker-hldq30t53-debojyoti-biswas-projects.vercel.app/api/health
```

**Expected Response:**
```json
{"status": "ok"}
```

❌ **If this fails:** Your API isn't deployed properly
✅ **If this works:** Move to Step 2

---

### **Step 2: Check Environment Variables**
Test if Supabase credentials are configured:

**Test this URL in your browser:**
```
https://cold-call-tracker-hldq30t53-debojyoti-biswas-projects.vercel.app/api/debug
```

**Expected Response:**
```json
{
  "supabase_url_set": true,
  "supabase_key_set": true,
  "environment_variables": ["SUPABASE_URL", "SUPABASE_KEY", ...]
}
```

❌ **If `supabase_url_set` or `supabase_key_set` is false:** Environment variables missing
✅ **If both are true:** Move to Step 3

---

### **Step 3: Test Database Connection**
Try to access the businesses endpoint:

**Test this URL:**
```
https://cold-call-tracker-hldq30t53-debojyoti-biswas-projects.vercel.app/api/businesses
```

**Expected Response:**
```json
[]
```
(Empty array is normal - you haven't uploaded data yet)

❌ **If this gives 500 error:** Database setup issue
✅ **If this works:** Database is connected

---

## 🛠️ **Fixes for Each Issue**

### **Fix 1: API Not Deployed**
```bash
# Redeploy your app
vercel --prod
```

### **Fix 2: Missing Environment Variables**
1. Go to [vercel.com](https://vercel.com)
2. Find your **Cold Call Tracker** project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   - **Name:** `SUPABASE_URL` **Value:** `https://your-project.supabase.co`
   - **Name:** `SUPABASE_KEY` **Value:** `your-service-role-key`
5. **Redeploy:**
   ```bash
   vercel --prod
   ```

### **Fix 3: Database Not Set Up**
1. Go to [supabase.com](https://supabase.com) → Your project → **SQL Editor**
2. Copy and paste the entire contents of `supabase-setup-safe.sql`
3. Run the script
4. You should see: `"Database setup completed successfully! 🎉"`

---

## 🎯 **Quick Diagnostic Commands**

### **Check if Environment Variables Are Set:**
```bash
# In your browser, visit:
https://cold-call-tracker-hldq30t53-debojyoti-biswas-projects.vercel.app/api/debug
```

### **Test Database Connection:**
```bash
# In your browser, visit:
https://cold-call-tracker-hldq30t53-debojyoti-biswas-projects.vercel.app/api/businesses
```

### **Check API Health:**
```bash
# In your browser, visit:
https://cold-call-tracker-hldq30t53-debojyoti-biswas-projects.vercel.app/api/health
```

---

## 📋 **Complete Setup Checklist**

### ✅ **Environment Variables (Vercel)**
- [ ] `SUPABASE_URL` is set
- [ ] `SUPABASE_KEY` is set 
- [ ] App has been redeployed after adding variables

### ✅ **Database Setup (Supabase)**
- [ ] `supabase-setup-safe.sql` has been run
- [ ] Script completed successfully
- [ ] Tables have been created

### ✅ **API Deployment**
- [ ] `/api/health` returns `{"status": "ok"}`
- [ ] `/api/debug` shows environment variables are set
- [ ] `/api/businesses` returns empty array `[]`

---

## 🎉 **Expected Working State**

When everything is set up correctly:

1. **Health Check:** ✅ `{"status": "ok"}`
2. **Debug Check:** ✅ Environment variables set
3. **Database Check:** ✅ Empty array `[]`
4. **JSON Upload:** ✅ Businesses will be added successfully

---

## 📞 **Most Common Issues & Solutions**

### **Issue: 500 Error**
**Cause:** Missing environment variables or database not set up
**Fix:** Complete Steps 2 & 3 above

### **Issue: 404 Error**
**Cause:** API routing issue or deployment problem
**Fix:** Redeploy with `vercel --prod`

### **Issue: Both 500 & 404**
**Cause:** Environment variables missing AND database not set up
**Fix:** Complete all steps above

---

## 🚀 **After Fixing**

Once all checks pass:
1. **Your JSON upload will work perfectly**
2. **101 businesses will be added from your dataset**
3. **Each user gets their own isolated data**
4. **No more 500/404 errors**

**Run through the diagnostic steps above and let me know which step fails!** 