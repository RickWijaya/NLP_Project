"""
Chat file handling module.
Processes file attachments in chat messages.
"""

import os
import uuid
from pathlib import Path
from typing import Optional, Tuple, List
from fastapi import UploadFile

from app.config import get_settings
from app.utils.logger import logger

settings = get_settings()

# Supported file types
ALLOWED_TYPES = {
    "image/jpeg": "image",
    "image/png": "image",
    "image/gif": "image",
    "image/webp": "image",
    "application/pdf": "pdf",
    "text/plain": "txt",
}

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB


async def validate_file(file: UploadFile) -> Tuple[bool, str]:
    """
    Validate uploaded file.
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check content type
    if file.content_type not in ALLOWED_TYPES:
        return False, f"Unsupported file type: {file.content_type}. Allowed: images, PDF, text."
    
    # Check file size (read content to check)
    content = await file.read()
    await file.seek(0)  # Reset for later use
    
    if len(content) > MAX_FILE_SIZE:
        size_mb = len(content) / (1024 * 1024)
        return False, f"File too large ({size_mb:.1f}MB). Maximum: 15MB."
    
    return True, ""


async def save_chat_attachment(
    file: UploadFile,
    tenant_id: str,
    session_id: str
) -> Tuple[str, str, str, int]:
    """
    Save an uploaded file attachment.
    
    Args:
        file: The uploaded file
        tenant_id: Tenant identifier
        session_id: Chat session ID
        
    Returns:
        Tuple of (saved_filename, file_path, file_type, file_size)
    """
    # Create directory structure
    upload_dir = Path(settings.upload_dir) / "chat_attachments" / tenant_id / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    ext = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / unique_name
    
    # Read and save content
    content = await file.read()
    file_size = len(content)
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    file_type = ALLOWED_TYPES.get(file.content_type, "unknown")
    
    logger.info(f"Saved chat attachment: {unique_name} ({file_size} bytes)")
    
    return unique_name, str(file_path), file_type, file_size


def extract_text_from_file(file_path: str, file_type: str) -> Optional[str]:
    """
    Extract text content from file for context.
    
    Args:
        file_path: Path to the file
        file_type: Type of file (image, pdf, txt)
        
    Returns:
        Extracted text content or None
    """
    try:
        if file_type == "txt":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()[:5000]  # Limit to 5000 chars
        
        elif file_type == "pdf":
            # Use existing PDF extraction
            from app.modules.extraction import extractor
            return extractor.extract_from_pdf(file_path)[:5000]
        
        elif file_type == "image":
            # For images, we can describe them or use vision models later
            return f"[Image attached: {Path(file_path).name}]"
        
        return None
        
    except Exception as e:
        logger.error(f"Failed to extract text from {file_path}: {e}")
        return None


def get_attachment_url(filename: str, tenant_id: str, session_id: str) -> str:
    """Get the URL to access an attachment."""
    return f"/chat/attachments/{tenant_id}/{session_id}/{filename}"
