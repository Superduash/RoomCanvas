"""
Migration script to fix timestamp columns to be timezone-aware.

This script:
1. Converts last_login_at and created_at columns from TIMESTAMP to TIMESTAMPTZ
2. Only runs on PostgreSQL (skips SQLite)
3. Can be run safely multiple times (idempotent)

Usage:
    python scripts/migrate_fix_timestamps.py
"""
import asyncio
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database.session import engine
from sqlalchemy import text


async def run_migration():
    """Run the timestamp migration for PostgreSQL databases."""
    
    # Check if we're using PostgreSQL
    database_url = settings.DATABASE_URL.lower()
    
    if "sqlite" in database_url:
        print("⏭️  Skipping migration: SQLite database detected.")
        print("   SQLite doesn't require timezone-aware column types.")
        print("   The Python code changes will handle datetime conversion.")
        return
    
    if "postgresql" not in database_url:
        print("⚠️  Warning: Unknown database type. This migration is designed for PostgreSQL.")
        response = input("Continue anyway? (yes/no): ")
        if response.lower() != "yes":
            print("Migration cancelled.")
            return
    
    print("🔧 Running timestamp column migration for PostgreSQL...")
    
    async with engine.begin() as conn:
        try:
            # Check if columns are already TIMESTAMPTZ
            result = await conn.execute(text("""
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name IN ('users', 'generations', 'variations')
                AND column_name IN ('last_login_at', 'created_at')
                ORDER BY table_name, column_name
            """))
            
            columns = {}
            for row in result:
                table, col, dtype = row
                if table not in columns:
                    columns[table] = {}
                columns[table][col] = dtype
            
            if not columns:
                print("❌ Error: tables not found or columns don't exist.")
                return
            
            migrations_applied = 0
            
            # Migrate users table
            if 'users' in columns:
                print("\n📋 users table:")
                if columns['users'].get('last_login_at') == 'timestamp without time zone':
                    print("   Converting last_login_at to TIMESTAMPTZ...")
                    await conn.execute(text("""
                        ALTER TABLE users 
                        ALTER COLUMN last_login_at TYPE TIMESTAMPTZ 
                        USING last_login_at AT TIME ZONE 'UTC'
                    """))
                    print("   ✅ last_login_at converted")
                    migrations_applied += 1
                else:
                    print(f"   ⏭️  last_login_at: {columns['users'].get('last_login_at', 'not found')}")
                
                if columns['users'].get('created_at') == 'timestamp without time zone':
                    print("   Converting created_at to TIMESTAMPTZ...")
                    await conn.execute(text("""
                        ALTER TABLE users 
                        ALTER COLUMN created_at TYPE TIMESTAMPTZ 
                        USING created_at AT TIME ZONE 'UTC'
                    """))
                    print("   ✅ created_at converted")
                    migrations_applied += 1
                else:
                    print(f"   ⏭️  created_at: {columns['users'].get('created_at', 'not found')}")
            
            # Migrate generations table
            if 'generations' in columns:
                print("\n📋 generations table:")
                if columns['generations'].get('created_at') == 'timestamp without time zone':
                    print("   Converting created_at to TIMESTAMPTZ...")
                    await conn.execute(text("""
                        ALTER TABLE generations 
                        ALTER COLUMN created_at TYPE TIMESTAMPTZ 
                        USING created_at AT TIME ZONE 'UTC'
                    """))
                    print("   ✅ created_at converted")
                    migrations_applied += 1
                else:
                    print(f"   ⏭️  created_at: {columns['generations'].get('created_at', 'not found')}")
            
            # Migrate variations table
            if 'variations' in columns:
                print("\n📋 variations table:")
                if columns['variations'].get('created_at') == 'timestamp without time zone':
                    print("   Converting created_at to TIMESTAMPTZ...")
                    await conn.execute(text("""
                        ALTER TABLE variations 
                        ALTER COLUMN created_at TYPE TIMESTAMPTZ 
                        USING created_at AT TIME ZONE 'UTC'
                    """))
                    print("   ✅ created_at converted")
                    migrations_applied += 1
                else:
                    print(f"   ⏭️  created_at: {columns['variations'].get('created_at', 'not found')}")
            
            if migrations_applied == 0:
                print("\n✅ All timestamp columns already correct - no changes needed!")
            else:
                print(f"\n✅ Migration completed! {migrations_applied} column(s) converted.")
            
            print("\nNext steps:")
            print("1. Deploy updated backend code to Render")
            print("2. Delete test Firebase user in Firebase Console")
            print("3. TRUNCATE users CASCADE; in Neon (if needed for clean test)")
            print("4. Fresh Google sign-in test")
            print("5. Verify /auth/sync returns 200 with full user profile")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            print("\nIf the error is about missing tables, you may need to:")
            print("1. Create the tables first")
            print("2. Or run previous migrations")
            raise


if __name__ == "__main__":
    asyncio.run(run_migration())
