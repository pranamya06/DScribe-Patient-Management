
import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const emptyPatient = {
  name: "",
  age: "",
  gender: "Male",
  ward: "General",
  department: "Cardiology",
  doctor: "Dr. Sharma",
  admission_date: new Date().toLocaleDateString("en-CA"),
  status: "Admitted",
};

function App() {
  const [patients, setPatients] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [ward, setWard] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyPatient);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toLocaleDateString("en-CA");

  // Load all patients for dashboard statistics
  async function loadAllPatients() {
    try {
      const response = await fetch(`${API}/patients`);
      if (!response.ok) throw new Error("Could not load patients");
      const data = await response.json();
      setAllPatients(data);
    } catch (err) {
      setError("Cannot connect to backend. Check that FastAPI is running.");
    }
  }

  // Load patients using search and filters
  async function loadPatients() {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search.trim());
      if (ward) params.append("ward", ward);
      if (department) params.append("department", department);
      if (doctor) params.append("doctor", doctor);

      const response = await fetch(
        `${API}/patients?${params.toString()}`
      );

      if (!response.ok) throw new Error("Unable to load patients");

      const data = await response.json();
      setPatients(data);
      setError("");
    } catch (err) {
      setError("Unable to connect to the backend. Please check FastAPI.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllPatients();
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadPatients, 300);
    return () => clearTimeout(timer);
  }, [search, ward, department, doctor]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyPatient, admission_date: today });
    setError("");
    setShowForm(true);
  }

  function openEditForm(patient) {
    setEditingId(patient.id);
    setForm({
      name: patient.name,
      age: String(patient.age),
      gender: patient.gender,
      ward: patient.ward,
      department: patient.department,
      doctor: patient.doctor,
      admission_date: patient.admission_date,
      status: patient.status,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedName = form.name.trim();

    if (!/^[A-Za-z ]+$/.test(trimmedName)) {
      setError("Name must contain letters and spaces only.");
      return;
    }

    if (
      form.age === "" ||
      !Number.isInteger(Number(form.age)) ||
      Number(form.age) < 0 ||
      Number(form.age) > 120
    ) {
      setError("Age must be a whole number between 0 and 120.");
      return;
    }

    if (!form.admission_date || form.admission_date > today) {
      setError("Admission date is required and cannot be in the future.");
      return;
    }

    const patientData = {
      ...form,
      name: trimmedName,
      age: Number(form.age),
    };

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `${API}/patients/${editingId}`
          : `${API}/patients`,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patientData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail
            ? typeof result.detail === "string"
              ? result.detail
              : result.detail.map((item) => item.msg).join(", ")
            : "Unable to save patient"
        );
      }

      setShowForm(false);
      setForm(emptyPatient);
      await Promise.all([loadPatients(), loadAllPatients()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePatient(id) {
    if (!window.confirm("Are you sure you want to delete this patient?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/patients/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Unable to delete patient");

      await Promise.all([loadPatients(), loadAllPatients()]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function dischargePatient(id) {
    if (!window.confirm("Mark this patient as discharged?")) return;

    try {
      const response = await fetch(
        `${API}/patients/${id}/discharge`,
        { method: "PATCH" }
      );

      if (!response.ok) throw new Error("Unable to discharge patient");

      await Promise.all([loadPatients(), loadAllPatients()]);
    } catch (err) {
      setError(err.message);
    }
  }

  const admittedCount = allPatients.filter(
    (p) => p.status === "Admitted"
  ).length;

  const dischargedCount = allPatients.filter(
    (p) => p.status === "Discharged"
  ).length;

  const departments = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Oncology",
  ];

  const doctors = [
    "Dr. Sharma",
    "Dr. Kumar",
    "Dr. Reddy",
    "Dr. Priya",
  ];

  const wards = ["General", "ICU", "Private"];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✚</div>
          <div>
            <h2>CarePoint</h2>
            <span>Hospital Management</span>
          </div>
        </div>

        <div className="nav-label">MAIN MENU</div>
        <div className="nav-item active">▦ &nbsp; Dashboard</div>
        <div className="nav-item">♙ &nbsp; Patients</div>

        <div className="sidebar-bottom">
          <div className="nav-label">SYSTEM</div>
          <div className="nav-item">⚙ &nbsp; Settings</div>
          <div className="profile">
            <div className="avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <span>Hospital Staff</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Patient Dashboard</h1>
            <p>Manage hospital admissions and patient records</p>
          </div>
          <div className="top-date">
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
        </header>

        <section className="welcome">
          <div>
            <h2>Welcome to CarePoint 👋</h2>
            <p>Here's an overview of your hospital patients.</p>
          </div>
          <button className="primary-btn" onClick={openAddForm}>
            + Add New Patient
          </button>
        </section>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        <section className="stats">
          <div className="stat-card">
            <div className="stat-icon blue">♙</div>
            <span>Total Patients</span>
            <h2>{allPatients.length}</h2>
            <small>All patient records</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✚</div>
            <span>Currently Admitted</span>
            <h2>{admittedCount}</h2>
            <small>Active admissions</small>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">✓</div>
            <span>Discharged</span>
            <h2>{dischargedCount}</h2>
            <small>Completed admissions</small>
          </div>
        </section>

        <section className="records">
          <div className="records-heading">
            <div>
              <h2>Patient Records</h2>
              <p>View and manage all patient information</p>
            </div>
            <span className="record-count">
              {patients.length} records
            </span>
          </div>

          <div className="filters">
            <input
              type="search"
              placeholder="Search patient by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select value={ward} onChange={(e) => setWard(e.target.value)}>
              <option value="">All Wards</option>
              {wards.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <button
              className="reset-btn"
              onClick={() => {
                setSearch("");
                setWard("");
                setDepartment("");
                setDoctor("");
              }}
            >
              Reset
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age / Gender</th>
                  <th>Ward</th>
                  <th>Department</th>
                  <th>Doctor</th>
                  <th>Admission Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="empty">
                      Loading patients...
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty">
                      No patients found. Add your first patient!
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <strong>{patient.name}</strong>
                        <small className="patient-id">
                          ID: #{patient.id}
                        </small>
                      </td>
                      <td>{patient.age} / {patient.gender}</td>
                      <td>{patient.ward}</td>
                      <td>{patient.department}</td>
                      <td>{patient.doctor}</td>
                      <td>{patient.admission_date}</td>
                      <td>
                        <span className={`status ${patient.status.toLowerCase()}`}>
                          {patient.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="edit-btn"
                            title="Edit patient"
                            onClick={() => openEditForm(patient)}
                          >
                            Edit
                          </button>

                          {patient.status === "Admitted" && (
                            <button
                              className="discharge-btn"
                              title="Discharge patient"
                              onClick={() => dischargePatient(patient.id)}
                            >
                              Discharge
                            </button>
                          )}

                          <button
                            className="delete-btn"
                            title="Delete patient"
                            onClick={() => deletePatient(patient.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer>
          CarePoint Patient Management System | Powered by React and FastAPI
        </footer>
      </main>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>{editingId ? "Edit Patient" : "Add New Patient"}</h2>
                <p>Enter the patient's admission details</p>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Patient Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Enter full name"
                required
              />

              <div className="form-grid">
                <div>
                  <label>Age *</label>
                  <input
                    name="age"
                    type="number"
                    min="0"
                    max="120"
                    value={form.age}
                    onChange={updateField}
                    required
                  />
                </div>

                <div>
                  <label>Gender *</label>
                  <select name="gender" value={form.gender} onChange={updateField}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label>Ward *</label>
                  <select name="ward" value={form.ward} onChange={updateField}>
                    {wards.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>

                <div>
                  <label>Department *</label>
                  <select
                    name="department"
                    value={form.department}
                    onChange={updateField}
                  >
                    {departments.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>

                <div>
                  <label>Doctor *</label>
                  <select name="doctor" value={form.doctor} onChange={updateField}>
                    {doctors.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>

                <div>
                  <label>Admission Date *</label>
                  <input
                    name="admission_date"
                    type="date"
                    max={today}
                    value={form.admission_date}
                    onChange={updateField}
                    required
                  />
                </div>
              </div>

              <label>Status *</label>
              <select name="status" value={form.status} onChange={updateField}>
                <option>Admitted</option>
                <option>Discharged</option>
              </select>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Patient"
                    : "Save Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
