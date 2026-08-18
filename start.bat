@echo off
echo Starting IoT Gas Booking System...

echo Starting Backend API Server...
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload"

echo Starting Frontend React App...
start cmd /k "cd frontend && npm run dev"

echo Both servers are starting in separate windows!
echo - Backend API: http://127.0.0.1:8000/docs
echo - Frontend App: http://localhost:5173
