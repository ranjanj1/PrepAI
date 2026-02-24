import asyncio
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from database import engine, User, Analysis, init_db
from sqlalchemy.ext.asyncio import AsyncSession


async def check_users():
    # Initialize DB first (creates tables if they don't exist)
    await init_db()
    print("Database initialized.\n")

    async with AsyncSession(engine) as session:
        # Check users
        result = await session.execute(select(User))
        users = result.scalars().all()

        print("=== USERS ===")
        if not users:
            print("No users found.")
        else:
            for user in users:
                print(f"ID: {user.id}, Email: {user.email}, Created: {user.created_at}")

        # Check analyses
        print("\n=== ANALYSES ===")
        result = await session.execute(select(Analysis))
        analyses = result.scalars().all()

        if not analyses:
            print("No analyses found.")
        else:
            for analysis in analyses:
                print(analysis.result_json)
                #print(f"ID: {analysis.id}, User ID: {analysis.user_id}, Role: {analysis.role}, Company: {analysis.company}")


if __name__ == "__main__":
    asyncio.run(check_users())
