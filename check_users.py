import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine("postgresql+asyncpg://mohitjangir@localhost:5432/wims_db")
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT email FROM users"))
        users = result.fetchall()
        print("USERS:", users)
        
asyncio.run(main())
