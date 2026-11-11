// student.js - shows one student's details and lets the admission status be changed.

const detailsCard = document.getElementById('details-card');
const detailsMessage = document.getElementById('details-message');
const statusSelect = document.getElementById('status-select');
const statusBadge = document.getElementById('d-status');
const statusFeedback = document.getElementById('status-feedback');

// The student's id comes from the URL: student.html?id=3
const studentId = new URLSearchParams(window.location.search).get('id');

// ---------- Helpers ----------

function showError(text) {
  detailsMessage.textContent = text;
  detailsMessage.classList.remove('hidden');
}

// Update the coloured status badge
function setBadge(status) {
  statusBadge.textContent = status;
  statusBadge.className = `badge badge-${status}`;
}

// Turn "2001-04-23" into a readable date
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---------- Load and display ----------

async function fetchStudent() {
  const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`);
  if (response.status === 404) throw new Error('This student could not be found.');
  if (!response.ok) throw new Error('Could not load the student details.');
  return response.json();
}

function displayStudent(student) {
  const photo = document.getElementById('student-photo');
  photo.src = student.imageUrl;
  photo.alt = `Photo of ${student.firstName} ${student.lastName}`;

  const set = (id, text) => { document.getElementById(id).textContent = text; };
  set('d-name', `${student.firstName} ${student.lastName}`);
  set('d-email', student.email);
  set('d-phone', student.phone);
  set('d-gender', student.gender);
  set('d-dob', formatDate(student.dateOfBirth));
  set('d-age', student.age);
  set('d-country', student.country);
  set('d-course', student.course);
  set('d-address', student.address);
  set('d-created', formatDate(student.createdAt.replace(' ', 'T') + 'Z'));

  setBadge(student.status);
  statusSelect.value = student.status;
  detailsCard.hidden = false;
}

// ---------- Change status (asynchronous) ----------

async function updateStatus(newStatus) {
  statusFeedback.textContent = 'Saving...';
  statusFeedback.style.color = '';

  try {
    const response = await fetch(`/api/students/${encodeURIComponent(studentId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message);

    setBadge(result.status);
    statusFeedback.textContent = 'Status updated.';
    statusFeedback.style.color = 'var(--success)';
  } catch (error) {
    statusFeedback.textContent = 'Could not update the status.';
    statusFeedback.style.color = 'var(--danger)';
    // Put the select back to what is actually saved
    statusSelect.value = statusBadge.textContent;
  }
}

async function init() {
  if (!studentId) {
    showError('No student was selected.');
    return;
  }
  try {
    displayStudent(await fetchStudent());
  } catch (error) {
    showError(error.message);
  }
}

statusSelect.addEventListener('change', () => updateStatus(statusSelect.value));
document.getElementById('status-form').addEventListener('submit', (e) => e.preventDefault());

init();
