// server.js - Express server for the Students' Portal.
// Serves the static pages, handles form submission (with image upload),
// and exposes JSON endpoints the client-side JavaScript uses.

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads'); // images live inside the project folder
const DB_FILE = path.join(__dirname, 'students.db');

const ALLOWED_STATUSES = ['Pending', 'Admitted', 'Rejected'];
const ALLOWED_GENDERS = ['Male', 'Female', 'Other'];
const REQUIRED_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'address',
  'dateOfBirth', 'gender', 'country', 'course', 'age'
];

// ---------- Setup: folders and database ----------

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name   TEXT NOT NULL,
    last_name    TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT NOT NULL,
    address      TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    gender       TEXT NOT NULL,
    country      TEXT NOT NULL,
    course       TEXT NOT NULL,
    age          INTEGER NOT NULL,
    image_name   TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'Pending',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ---------- Image upload configuration ----------

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Unique, safe file name: timestamp + random number + original extension
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, GIF or WEBP images are allowed.'));
  }
});

// ---------- Helpers ----------

// Server-side validation: every required field must be filled
function validateStudent(body, file) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || String(body[field]).trim() === '') errors.push(`${field} is required`);
  }
  if (!file) errors.push('image is required');
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('email is invalid');
  if (body.gender && !ALLOWED_GENDERS.includes(body.gender)) errors.push('gender is invalid');
  const age = Number(body.age);
  if (body.age && (!Number.isInteger(age) || age < 10 || age > 100)) errors.push('age must be a whole number between 10 and 100');
  return errors;
}

// Convert a database row into the shape the client uses
function toStudent(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    country: row.country,
    course: row.course,
    age: row.age,
    imageName: row.image_name,
    imageUrl: `/uploads/${row.image_name}`,
    status: row.status,
    createdAt: row.created_at
  };
}

// Remove an uploaded file if saving to the database fails
function removeUpload(file) {
  if (file) fs.unlink(file.path, () => {});
}

// ---------- App and routes ----------

const app = express();
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// POST /api/students - save a new student (form data + image)
app.post('/api/students', (req, res) => {
  upload.single('image')(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ success: false, message: uploadError.message });
    }

    const errors = validateStudent(req.body, req.file);
    if (errors.length > 0) {
      removeUpload(req.file);
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    try {
      const b = req.body;
      db.prepare(`
        INSERT INTO students
          (first_name, last_name, email, phone, address, date_of_birth,
           gender, country, course, age, image_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        b.firstName.trim(), b.lastName.trim(), b.email.trim(), b.phone.trim(),
        b.address.trim(), b.dateOfBirth, b.gender, b.country, b.course,
        Number(b.age), req.file.filename // only the image NAME goes in the database
      );
      res.status(201).json({ success: true, message: 'Student saved successfully.' });
    } catch (err) {
      console.error('Database error:', err);
      removeUpload(req.file);
      res.status(500).json({ success: false, message: 'Could not save the student. Please try again.' });
    }
  });
});

// GET /api/students - list all students
app.get('/api/students', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM students ORDER BY id ASC').all();
    res.json(rows.map(toStudent));
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ success: false, message: 'Could not load students.' });
  }
});

// GET /api/students/:id - one student's full details
app.get('/api/students/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM students WHERE id = ?').get(Number(req.params.id));
    if (!row) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json(toStudent(row));
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ success: false, message: 'Could not load the student.' });
  }
});

// PATCH /api/students/:id/status - change admission status
app.patch('/api/students/:id/status', (req, res) => {
  const { status } = req.body;
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  try {
    const result = db.prepare('UPDATE students SET status = ? WHERE id = ?')
      .run(status, Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, status });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ success: false, message: 'Could not update the status.' });
  }
});

app.listen(PORT, () => {
  console.log(`Students' Portal running at http://localhost:${PORT}`);
});
