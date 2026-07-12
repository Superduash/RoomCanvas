# Supabase Storage Migration Guide

This guide walks through migrating RoomCanvas AI from local filesystem storage to Supabase Storage, fixing the "files lost on Render redeploy" issue.

## Why This Migration?

Render's ephemeral filesystem means any files saved to `storage/` are lost on every redeploy. Supabase Storage provides:
- ✅ Persistent storage that survives deploys
- ✅ Public CDN for fast image delivery
- ✅ 1GB free tier (plenty for demo/MVP)
- ✅ No code changes to database or core logic

## Prerequisites

You already have:
- Supabase project URL: `https://fiyobpuaxeihkvcklvai.supabase.co`
- Supabase service role key (from provided credentials)

## Step 1: Create Supabase Storage Bucket

1. Go to https://supabase.com/dashboard/project/fiyobpuaxeihkvcklvai/storage/buckets
2. Click **"New bucket"**
3. Name: `roomcanvas`
4. Toggle **"Public bucket"** ON (images need to be publicly accessible)
5. Click **"Create bucket"**

This is the only dashboard setup required.

## Step 2: Update Backend Environment Variables

### On Render (Production)

1. Go to your Render dashboard → RoomCanvas backend service → Environment
2. Add these three variables:
   ```
   SUPABASE_URL=https://fiyobpuaxeihkvcklvai.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeW9icHVheGVpaGt2Y2tsdmFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzE2NzA4NywiZXhwIjoyMDUyNzQzMDg3fQ.f78JouTYCrahIBWQSV8QwA_V3j6O3KY
   SUPABASE_BUCKET=roomcanvas
   ```
3. Click **"Save Changes"** (this will trigger a redeploy)

### Locally (Development - Optional)

Add to `backend/.env`:
```bash
SUPABASE_URL=https://fiyobpuaxeihkvcklvai.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpeW9icHVheGVpaGt2Y2tsdmFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzE2NzA4NywiZXhwIjoyMDUyNzQzMDg3fQ.f78JouTYCrahIBWQSV8QwA_V3j6O3KY
SUPABASE_BUCKET=roomcanvas
```

## Step 3: Update Frontend Environment Variables

### On Vercel (Production)

1. Go to Vercel dashboard → RoomCanvas frontend → Settings → Environment Variables
2. Add:
   ```
   VITE_SUPABASE_URL=https://fiyobpuaxeihkvcklvai.supabase.co
   ```
3. Trigger redeploy

### Locally (Development)

Add to `frontend/.env`:
```bash
VITE_SUPABASE_URL=https://fiyobpuaxeihkvcklvai.supabase.co
```

## Step 4: Install Dependencies and Deploy

### Backend

```bash
cd backend
pip install supabase>=2.0.0
```

The code changes are already committed. When Render redeploys (from Step 2), it will:
1. Install the new `supabase` package from requirements.txt
2. Use Supabase Storage instead of local filesystem
3. All new uploads/generations will go to Supabase

### Frontend

No new dependencies needed. Just redeploy after setting `VITE_SUPABASE_URL`.

## Step 5: Test End-to-End

1. **Upload a room image** → Check Supabase dashboard → Storage → roomcanvas bucket → You should see `uploads/[uuid].jpg`
2. **Generate a design** → Check for `generated/[uuid]_gen.png` in the same bucket
3. **Trigger a Render redeploy** (push a dummy commit or manual redeploy)
4. **Reload the app** → The same images should still display (proving persistence)

If step 4 works, the bug is fixed. Images now survive deploys.

## What Changed in the Code

### Backend (`app/services/storage_service.py`)
- `save_upload()` now uploads to Supabase Storage (returns a key like `uploads/xyz.jpg`)
- `download_and_save()` uploads generated images to Supabase
- `resolve_public_url()` converts keys to full Supabase CDN URLs
- `delete_file_if_exists()` deletes from Supabase instead of local disk

### Frontend (`src/api/client.ts`)
- `resolveImageUrl()` now constructs Supabase public URLs:
  ```
  uploads/xyz.jpg → https://fiyobpuaxeihkvcklvai.supabase.co/storage/v1/object/public/roomcanvas/uploads/xyz.jpg
  ```

### Backend (`app/main.py`)
- Removed `/static` file mounting (no longer needed)
- Added Supabase configuration check on startup

## Rollback Plan (If Needed)

If something breaks:

1. Revert `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Render (delete them)
2. Redeploy from the previous commit (before this migration)
3. Old local filesystem behavior will resume

## Cost & Limits

**Supabase Free Tier:**
- 1 GB storage (≈ 500-1000 design images)
- 2 GB bandwidth/month (≈ 1000-2000 image loads)
- No credit card required

This is more than enough for MVP/demo. If you exceed limits, upgrade to Pro ($25/mo for 100GB).

## Migration Complete ✅

Once deployed and tested:
- ✅ Images persist across Render redeploys
- ✅ No more "files lost" warnings in logs
- ✅ Faster image delivery via Supabase CDN
- ✅ Same database, same API, same frontend logic

The only difference: images are now stored remotely, not locally.
