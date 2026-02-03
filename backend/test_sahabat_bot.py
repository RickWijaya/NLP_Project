import asyncio
import os
import shutil
import uuid
import json
from app.database import async_session_maker
from sqlalchemy import select
from app.models.document import Admin, Document, DocumentStatus, TenantSettings
from app.routers.admin import process_document
from app.routers.chat import generate_response
from app.modules.intelligence import intelligence
from app.config import get_settings

settings = get_settings()

QUERY_CASES = [
    "What are the operating hours on weekends?",
    "Do you have vegan options?",
    "How much is the Cheese Burger?",
    "Is there wifi?",
    "Where is the cafe located?",
    "What are your best sellers?",
    "Contact number?"
]

TEST_TENANT_ID = "sahabat_test"
TEST_FILE = "sahabat_cafe.txt"

async def test_sahabat_bot():
    print(f"--- Starting Sahabat Cafe Test (Tenant: {TEST_TENANT_ID}) ---")
    
    async with async_session_maker() as db:
        # 1. Ensure Tenant Admin exists
        result = await db.execute(select(Admin).where(Admin.tenant_id == TEST_TENANT_ID))
        admin = result.scalar_one_or_none()
        
        if not admin:
            print("Creating test tenant admin...")
            admin = Admin(
                username="sahabat_admin", 
                email="sahabat@test.com", 
                hashed_password="hash", 
                tenant_id=TEST_TENANT_ID,
                is_active=True
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
        
        # 2. Ensure Tenant Settings exist
        result = await db.execute(select(TenantSettings).where(TenantSettings.tenant_id == TEST_TENANT_ID))
        tenant_settings = result.scalar_one_or_none()
        if not tenant_settings:
            print("Creating tenant settings...")
            tenant_settings = TenantSettings(tenant_id=TEST_TENANT_ID)
            db.add(tenant_settings)
            await db.commit()
            await db.refresh(tenant_settings)

        # 3. Check/Upload Document
        result = await db.execute(select(Document).where(
            Document.tenant_id == TEST_TENANT_ID,
            Document.original_filename == TEST_FILE
        ))
        document = result.scalar_one_or_none()
        
        if document:
            print(f"Document {TEST_FILE} already exists. ID: {document.id}")
        else:
            print(f"Uploading {TEST_FILE}...")
            unique_filename = f"{uuid.uuid4()}.txt"
            file_path = os.path.join(settings.upload_dir, unique_filename)
            shutil.copy(TEST_FILE, file_path)
            
            document = Document(
                tenant_id=TEST_TENANT_ID,
                filename=unique_filename,
                original_filename=TEST_FILE,
                file_type="txt",
                file_size=os.path.getsize(file_path),
                file_path=file_path,
                uploaded_by_id=admin.id,
                status=DocumentStatus.PENDING
            )
            db.add(document)
            await db.commit()
            await db.refresh(document)
            
            print(f"Processing document {document.id}...")
            await process_document(
                str(document.id),
                file_path,
                TEST_TENANT_ID,
                document.version,
                TEST_FILE,
                settings.database_url
            )
            print("Document processed.")

        # 4. Run Chat Tests
        print("\n--- Running Chat Tests ---\n")
        history = []
        results_data = []
        
        for q in QUERY_CASES:
            print(f"Q: {q}")
            
            # Simulate intelligence layer
            intents = await intelligence.classify_intent(q, history)
            context = await intelligence.extract_context(q, history, None)
            
            # Generate response
            response, retrieved, model = await generate_response(
                question=q,
                tenant_id=TEST_TENANT_ID,
                settings=tenant_settings,
                conversation_history=history,
                context_summary=context
            )
            
            print(f"A: {response[:50]}...")
            
            history.append({"role": "user", "content": q})
            history.append({"role": "assistant", "content": response})
            
            results_data.append({
                "question": q,
                "answer": response,
                "intent": intents[0] if intents else "None",
                "chunks": len(retrieved)
            })

        with open("sahabat_results.json", "w") as f:
            json.dump(results_data, f, indent=2)
        print("Results saved to sahabat_results.json")

if __name__ == "__main__":
    asyncio.run(test_sahabat_bot())
