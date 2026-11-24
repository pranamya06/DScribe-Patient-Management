
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from datetime import date
from enum import Enum
import sqlite3

app = FastAPI(title="DScribe Patient Management API")

# Allow React frontend to communicate with Python backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE = "patients.db"

# Dropdown options
class Gender(str, Enum):
    Male = "Male"
    Female = "Female"
    Other = "Other"

class Ward(str, Enum):
    General = "General"
    ICU = "ICU"
    Private = "Private"

class Department(str, Enum):
    Cardiology = "Cardiology"
    Neurology = "Neurology"
    Orthopedics = "Orthopedics"
    Pediatrics = "Pediatrics"
    Oncology = "Oncology"

class Doctor(str, Enum):
    Sharma = "Dr. Sharma"
    Kumar = "Dr. Kumar"
    Reddy = "Dr. Reddy"
    Priya = "Dr. Priya"

class Status(str, Enum):
    Admitted = "Admitted"
    Discharged = "Discharged"


# Database connection
def get_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


# Create database table
def initialize_database():
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            ward TEXT NOT NULL,
            department TEXT NOT NULL,
            doctor TEXT NOT NULL,
            admission_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Admitted'
        )
    """)

    conn.commit()
    conn.close()


initialize_database()


# Patient validation
class PatientCreate(BaseModel):
    name: str = Field(min_length=1)
    age: int = Field(ge=0, le=120)
    gender: Gender
    ward: Ward
    department: Department
    doctor: Doctor
    admission_date: date
    status: Status = Status.Admitted

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()

        if not value or not all(
            character.isalpha() or character.isspace()
            for character in value
        ):
            raise ValueError("Name must contain letters and spaces only")

        return value

    @field_validator("admission_date")
    @classmethod
    def validate_admission_date(cls, value):
        if value > date.today():
            raise ValueError("Admission date cannot be in the future")

        return value


# Welcome route
@app.get("/")
def home():
    return {"message": "DScribe Patient Management API is running"}


# Add patient
@app.post("/patients", status_code=201)
def add_patient(patient: PatientCreate):
    conn = get_connection()

    cursor = conn.execute("""
        INSERT INTO patients
        (name, age, gender, ward, department, doctor,
         admission_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        patient.name,
        patient.age,
        patient.gender.value,
        patient.ward.value,
        patient.department.value,
        patient.doctor.value,
        patient.admission_date.isoformat(),
        patient.status.value
    ))

    patient_id = cursor.lastrowid
    conn.commit()

    result = conn.execute(
        "SELECT * FROM patients WHERE id = ?", (patient_id,)
    ).fetchone()

    conn.close()
    return dict(result)


# View and filter patients
@app.get("/patients")
def get_patients(
    search: str = "",
    ward: Ward = None,
    department: Department = None,
    doctor: Doctor = None
):
    conn = get_connection()

    query = "SELECT * FROM patients WHERE 1=1"
    params = []

    if search:
        query += " AND name LIKE ?"
        params.append(f"%{search}%")

    if ward:
        query += " AND ward = ?"
        params.append(ward.value)

    if department:
        query += " AND department = ?"
        params.append(department.value)

    if doctor:
        query += " AND doctor = ?"
        params.append(doctor.value)

    query += " ORDER BY id DESC"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [dict(row) for row in rows]


# Edit patient
@app.put("/patients/{patient_id}")
def update_patient(patient_id: int, patient: PatientCreate):
    conn = get_connection()

    existing = conn.execute(
        "SELECT id FROM patients WHERE id = ?", (patient_id,)
    ).fetchone()

    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Patient not found")

    conn.execute("""
        UPDATE patients SET
        name=?, age=?, gender=?, ward=?, department=?,
        doctor=?, admission_date=?, status=?
        WHERE id=?
    """, (
        patient.name,
        patient.age,
        patient.gender.value,
        patient.ward.value,
        patient.department.value,
        patient.doctor.value,
        patient.admission_date.isoformat(),
        patient.status.value,
        patient_id
    ))

    conn.commit()

    result = conn.execute(
        "SELECT * FROM patients WHERE id = ?", (patient_id,)
    ).fetchone()

    conn.close()
    return dict(result)


# Delete patient
@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: int):
    conn = get_connection()

    cursor = conn.execute(
        "DELETE FROM patients WHERE id = ?", (patient_id,)
    )

    conn.commit()
    deleted = cursor.rowcount
    conn.close()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {"message": "Patient deleted successfully"}


# Discharge patient
@app.patch("/patients/{patient_id}/discharge")
def discharge_patient(patient_id: int):
    conn = get_connection()

    cursor = conn.execute("""
        UPDATE patients SET status = 'Discharged'
        WHERE id = ?
    """, (patient_id,))

    conn.commit()
    updated = cursor.rowcount
    conn.close()

    if updated == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {"message": "Patient discharged successfully"}
