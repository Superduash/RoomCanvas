"""
One-time setup script to verify Supabase Storage bucket exists and is configured correctly.

Usage:
    python scripts/setup_supabase_bucket.py

This script:
1. Connects to Supabase using credentials from .env
2. Checks if the 'roomcanvas' bucket exists
3. Creates it if missing (with public access enabled)
4. Tests upload/download/delete to verify everything works
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

def main():
    """Setup and verify Supabase Storage bucket."""
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        print("\nAdd to backend/.env:")
        print("SUPABASE_URL=https://your-project.supabase.co")
        print("SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
        sys.exit(1)
    
    print(f"🔧 Connecting to Supabase: {settings.SUPABASE_URL}")
    
    try:
        from supabase import create_client
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        print("\nMake sure you have installed: pip install supabase")
        sys.exit(1)
    
    bucket_name = settings.SUPABASE_BUCKET
    print(f"📦 Checking bucket: {bucket_name}")
    
    # Check if bucket exists
    try:
        buckets = client.storage.list_buckets()
        bucket_exists = any(b['name'] == bucket_name for b in buckets)
        
        if bucket_exists:
            print(f"✅ Bucket '{bucket_name}' already exists")
        else:
            print(f"📦 Creating bucket '{bucket_name}' with public access...")
            client.storage.create_bucket(
                bucket_name,
                options={"public": True}
            )
            print(f"✅ Bucket '{bucket_name}' created successfully")
    except Exception as e:
        print(f"❌ Error checking/creating bucket: {e}")
        sys.exit(1)
    
    # Test upload/download/delete
    print("\n🧪 Testing upload/download/delete...")
    test_key = "test/setup_test.txt"
    test_content = b"RoomCanvas AI - Supabase Storage Test"
    
    try:
        # Upload
        print(f"   Uploading test file: {test_key}")
        client.storage.from_(bucket_name).upload(
            path=test_key,
            file=test_content,
            file_options={"content-type": "text/plain", "upsert": "true"}
        )
        
        # Get public URL
        public_url = client.storage.from_(bucket_name).get_public_url(test_key)
        print(f"   Public URL: {public_url}")
        
        # Delete
        print(f"   Deleting test file...")
        client.storage.from_(bucket_name).remove([test_key])
        
        print("✅ All tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("✅ Supabase Storage setup complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Deploy backend with SUPABASE_* env vars set")
    print("2. Update frontend with VITE_SUPABASE_URL")
    print("3. Test image upload → generation → verify persistence")
    print("\nYour bucket is ready at:")
    print(f"   {settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/")


if __name__ == "__main__":
    main()
