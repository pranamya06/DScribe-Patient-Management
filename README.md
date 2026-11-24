
# Patient Admission Management System

A full-stack web application for managing hospital patient admission records.

## Features
- Add new patient records
- View all patients
- Edit patient details
- Search patients by name
- Filter by ward, department, and doctor
- Mark patients as discharged
- Delete patient records with confirmation
- Frontend and backend validation
- Responsive dashboard

## Technology Stack
- Frontend: React.js, Vite, CSS
- Backend: Python, FastAPI
- Database: SQLite
- API Documentation: Swagger UI

## Project Structure
- frontend/ - React application
- backend/ - FastAPI application

## Run Locally

### Backend
1. Open the backend folder.
2. Create and activate a Python virtual environment.
3. Install dependencies:

   pip install -r requirements.txt

4. Start the backend:

   uvicorn main:app --reload

Backend: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

### Frontend
1. Open the frontend folder.
2. Install dependencies:

   npm install

3. Start the application:

   npm run dev

Frontend: http://localhost:5173
