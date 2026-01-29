"""
Logging configuration for the RAG service.
"""

import logging
import sys
from datetime import datetime
from pathlib import Path

from app.config import get_settings

settings = get_settings()


def setup_logging() -> logging.Logger:
    """
    Configure and return the application logger.
    
    Returns:
        Configured logger instance
    """
    # Create logs directory if it doesn't exist
    log_dir = Path("./logs")
    log_dir.mkdir(exist_ok=True)
    
    # Create logger
    logger = logging.getLogger("rag_service")
    logger.setLevel(logging.DEBUG if settings.debug else logging.INFO)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG if settings.debug else logging.INFO)
    console_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_format)
    
    # File handler for general logs
    file_handler = logging.FileHandler(
        log_dir / f"rag_service_{datetime.now().strftime('%Y%m%d')}.log"
    )
    file_handler.setLevel(logging.INFO)
    file_format = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_format)
    
    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger


# Global logger instance
logger = setup_logging()


def log_processing_step(
    document_id: str,
    step: str,
    status: str,
    message: str = ""
) -> None:
    """
    Log a document processing step.
    
    Args:
        document_id: ID of the document being processed
        step: Processing step name (extraction, preprocessing, etc.)
        status: Status of the step (started, completed, failed)
        message: Optional additional message
    """
    log_msg = f"[Doc:{document_id}] [{step.upper()}] {status}"
    if message:
        log_msg += f" - {message}"
    
    if status == "failed":
        logger.error(log_msg)
    elif status == "completed":
        logger.info(log_msg)
    else:
        logger.debug(log_msg)
