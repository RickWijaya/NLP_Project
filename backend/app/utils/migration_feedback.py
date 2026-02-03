import logging
from sqlalchemy import text
from app.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """
    Manually add rating and feedback_text columns to chat_messages table.
    Safe to run even if columns exist (handled via exception or check).
    """
    logger.info("Starting database migration for Feedback System...")
    
    conn = engine.connect()
    try:
        # 1. Add rating column
        try:
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN rating INTEGER NULL;"))
            logger.info("Added 'rating' column.")
        except Exception as e:
            if "duplicate column" in str(e) or "already exists" in str(e):
                logger.info("'rating' column already exists.")
            else:
                logger.warning(f"Error adding 'rating' column: {e}")

        # 2. Add feedback_text column
        try:
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN feedback_text VARCHAR(500) NULL;"))
            logger.info("Added 'feedback_text' column.")
        except Exception as e:
            if "duplicate column" in str(e) or "already exists" in str(e):
                logger.info("'feedback_text' column already exists.")
            else:
                logger.warning(f"Error adding 'feedback_text' column: {e}")

        conn.commit()
        logger.info("Migration completed successfully.")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
