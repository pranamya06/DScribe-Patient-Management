
import os
import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from datetime import date
from enum import Enum

app = FastAPI(title="DScribe Patient Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://d-scribe-patient-management-hfrgxbtau-pnk11.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")


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


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is missing")

    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row
    )


def initialize_database():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                ward TEXT NOT NULL,
                department TEXT NOT NULL,
                doctor TEXT NOT NULL,
                admission_date DATE NOT NULL,
                status TEXT NOT NULL DEFAULT 'Admitted'
            )
        """)


initialize_database()


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
            raise ValueError(
                "Name must contain letters and spaces only"
            )
        return value

    @field_validator("admission_date")
    @classmethod
    def validate_admission_date(cls, value):
        if value > date.today():
            raise ValueError(
                "Admission date cannot be in the future"
            )
        return value


@app.get("/")
def home():
    return {
        "message": "DScribe Patient Management API is running"
    }


@app.post("/patients", status_code=201)
def add_patient(patient: PatientCreate):
    with get_connection() as conn:
        result = conn.execute("""
            INSERT INTO patients
            (name, age, gender, ward, department, doctor,
             admission_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            patient.name,
            patient.age,
            patient.gender.value,
            patient.ward.value,
            patient.department.value,
            patient.doctor.value,
            patient.admission_date,
            patient.status.value
        )).fetchone()

        return result


@app.get("/patients")
def get_patients(
    search: str = "",
    ward: Ward = None,
    department: Department = None,
    doctor: Doctor = None
):
    query = "SELECT * FROM patients WHERE 1=1"
    params = []

    if search:
        query += " AND name ILIKE %s"
        params.append(f"%{search}%")

    if ward:
        query += " AND ward = %s"
        params.append(ward.value)

    if department:
        query += " AND department = %s"
        params.append(department.value)

    if doctor:
        query += " AND doctor = %s"
        params.append(doctor.value)

    query += " ORDER BY id DESC"

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return rows


@app.put("/patients/{patient_id}")
def update_patient(patient_id: int, patient: PatientCreate):
    with get_connection() as conn:
        result = conn.execute("""
            UPDATE patients SET
            name=%s, age=%s, gender=%s, ward=%s,
            department=%s, doctor=%s,
            admission_date=%s, status=%s
            WHERE id=%s
            RETURNING *
        """, (
            patient.name,
            patient.age,
            patient.gender.value,
            patient.ward.value,
            patient.department.value,
            patient.doctor.value,
            patient.admission_date,
            patient.status.value,
            patient_id
        )).fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        return result


@app.delete("/patients/{patient_id}")
def delete_patient(patient_id: int):
    with get_connection() as conn:
        result = conn.execute("""
            DELETE FROM patients
            WHERE id = %s
            RETURNING id
        """, (patient_id,)).fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        return {"message": "Patient deleted successfully"}


@app.patch("/patients/{patient_id}/discharge")
def discharge_patient(patient_id: int):
    with get_connection() as conn:
        result = conn.execute("""
            UPDATE patients
            SET status = 'Discharged'
            WHERE id = %s
            RETURNING id
        """, (patient_id,)).fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        return {"message": "Patient discharged successfully"}
