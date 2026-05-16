@echo off
echo Starting Backend Server...
start cmd /k "cd backend && uvicorn main:app --reload --port 8000"

echo Starting Frontend Server...
start cmd /k "cd frontend && npm run dev"

echo Both servers are starting! The frontend will be available at http://localhost:5173
