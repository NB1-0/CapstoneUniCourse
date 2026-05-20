import time

from fastapi import APIRouter, HTTPException

from app.schemas.request import IngestRequest
from app.schemas.response import IngestResponse

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse, tags=["Ingestion"])
async def ingest_data(request: IngestRequest):
    start = time.time()
    try:
        from app.ingestion.ingest import ingest_courses, load_sample_data
        if request.source == "sample":
            count = await load_sample_data()
        else:
            count = await ingest_courses(request.file_path)
        return IngestResponse(
            success=True,
            courses_ingested=count,
            message=f"Successfully ingested {count} courses from {request.source}.",
            processing_time_ms=round((time.time() - start) * 1000, 2),
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
    except Exception as e:
        return IngestResponse(
            success=False,
            courses_ingested=0,
            message=f"Ingestion failed: {str(e)}",
            processing_time_ms=round((time.time() - start) * 1000, 2),
        )
