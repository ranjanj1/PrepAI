# PrepAI/backend/test_agent.py
import asyncio
import logging
import sys

# Enable logging to see what's happening
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

from backend.agent import run_analysis

async def mock_progress_callback(data: dict):
    """Print progress updates"""
    print(f"📍 Progress: {data}")

async def test():
    # Test with a real job posting URL or a mock one
    test_url = "https://www.linkedin.com/jobs/view/4346161077/"  # Example
    
    print(f"\n🚀 Starting analysis for: {test_url}\n")
    
    try:
        result = await run_analysis(test_url, mock_progress_callback)
        
        print("\n✅ Analysis complete!\n")
        print("=" * 50)
        print(f"Role: {result.get('role')}")
        print(f"Company: {result.get('company')}")
        print(f"Location: {result.get('location')}")
        print(f"\nSkills: {len(result.get('skills', []))} found")
        for skill in result.get('skills', [])[:5]:
            print(f"  - {skill.get('name')} (primary: {skill.get('primary')})")
        
        print(f"\nTopics: {len(result.get('topics', []))} found")
        for topic in result.get('topics', [])[:5]:
            print(f"  - {topic.get('name')} (weight: {topic.get('weight')})")
        
        questions = result.get('questions', {})
        print(f"\nQuestions:")
        print(f"  - Technical: {len(questions.get('technical', []))}")
        print(f"  - System Design: {len(questions.get('sysdesign', []))}")
        print(f"  - Behavioral: {len(questions.get('behavioral', []))}")
        
        print("\n" + "=" * 50)
        print("\n📄 Full result:")
        import json
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        logging.exception("Full traceback:")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test())
