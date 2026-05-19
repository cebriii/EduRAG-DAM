from fastapi import APIRouter, HTTPException, UploadFile, File

from app.services.documents_service import delete_all_documents, delete_document, ingest_pdf, list_documents

router = APIRouter()


@router.get("/documents")
def get_documents():
    return {"documents": list_documents()}


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")
    content = await file.read()
    result = ingest_pdf(content, file.filename)
    if result["error"]:
        raise HTTPException(status_code=422, detail=result["error"])
    return result


@router.delete("/documents")
def remove_all_documents():
    return delete_all_documents()


@router.delete("/documents/{filename}")
def remove_document(filename: str):
    result = delete_document(filename)
    if result["deleted"] == 0:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return result
