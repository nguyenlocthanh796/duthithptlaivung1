"""Test script for /ai/chat endpoint"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.routers.lm import chat
from app.schemas import PromptRequest

async def test_chat():
    """Test chat endpoint"""
    try:
        request = PromptRequest(
            prompt="Xin chào, bạn có thể giúp tôi không?",
            temperature=0.7,
            max_tokens=100
        )
        result = await chat(request)
        print(f"✅ Success! Answer: {result.answer[:100]}...")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_chat())
    sys.exit(0 if success else 1)

