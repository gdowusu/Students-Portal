// students.js - fetches every student and renders them in the index table.

const tableBody = document.getElementById('students-body');
const tableMessage = document.getElementById('table-message');

// Fetch all students from the server
async function fetchStudents() {
  const response = await fetch('/api/students');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Build one table row for a student
function createRow(student, index) {
  const row = document.createElement('tr');

  // Helper: append a plain text cell
  const addCell = (text) => {
    const cell = document.createElement('td');
    cell.textContent = text; // textContent avoids injecting HTML from user data
    row.appendChild(cell);
    return cell;
  };

  addCell(index + 1);
  addCell(`${student.firstName} ${student.lastName}`);
  addCell(student.email);
  addCell(student.course);
  addCell(student.country);

  // Status badge
  const statusCell = addCell('');
  const badge = document.createElement('span');
  badge.className = `badge badge-${student.status}`;
  badge.textContent = student.status;
  statusCell.appendChild(badge);

  // View button: goes to the details page for this student
  const viewCell = addCell('');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-small';
  button.textContent = 'View';
  button.addEventListener('click', () => {
    window.location.href = `/student.html?id=${student.id}`;
  });
  viewCell.appendChild(button);

  return row;
}

// Render all rows, or an empty-state message
function renderTable(students) {
  tableBody.innerHTML = '';

  if (students.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No students yet. <a href="/form.html">Register the first one.</a></td></tr>';
    return;
  }

  students.forEach((student, index) => tableBody.appendChild(createRow(student, index)));
}

async function init() {
  try {
    renderTable(await fetchStudents());
  } catch (error) {
    console.error('Could not load students:', error);
    tableBody.innerHTML = '';
    tableMessage.textContent = 'Could not load students. Please refresh the page.';
    tableMessage.classList.remove('hidden');
  }
}

init();
