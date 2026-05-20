"""Seed script: triggers the backend ingestion API to load sample data."""
import asyncio
import httpx


async def seed(base_url: str = "http://localhost:8000"):
    print(f"Connecting to {base_url}...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Health check
        try:
            r = await client.get(f"{base_url}/api/health")
            data = r.json()
            print(f"Backend: {data['status']} | Mock mode: {data['mock_mode']}")
        except Exception as e:
            print(f"Cannot reach backend: {e}")
            return

        # Ingest sample data
        print("Ingesting sample courses...")
        r = await client.post(f"{base_url}/api/ingest", json={"source": "sample"})
        result = r.json()
        if result["success"]:
            print(f"✓ Ingested {result['courses_ingested']} courses in {result['processing_time_ms']:.0f}ms")
        else:
            print(f"✗ Ingestion failed: {result['message']}")

        # Verify with a search
        print("Verifying with test search...")
        r = await client.post(f"{base_url}/api/search", json={"query": "machine learning", "top_k": 3})
        results = r.json()
        print(f"✓ Search returned {results['total']} results")
        for course in results["results"][:3]:
            print(f"  - {course['course_name']} ({course['organization']}) ★{course['rating']}")

    print("\n✅ Seed complete! Visit http://localhost:3000 to use IntelliCourse AI.")


if __name__ == "__main__":
    asyncio.run(seed())
