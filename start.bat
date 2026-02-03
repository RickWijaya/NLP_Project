@echo off
echo Starting RAG Service...

:: Start Backend
echo Starting Backend...
start "Backend API" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload"

:: Start Frontend
echo Starting Frontend...
start "Frontend App" cmd /k "npm run dev"

echo Services started!
