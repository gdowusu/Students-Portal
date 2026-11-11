// form.js - logic for the registration form page:
// 1) populate select boxes asynchronously, 2) validate, 3) submit, 4) redirect or show error.

const form = document.getElementById('portal-form');
const submitBtn = document.getElementById('submit-btn');
const formMessage = document.getElementById('form-message');

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB, matches the server limit
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

// ---------- Populate select boxes (asynchronous) ----------

// Fill a <select> with a placeholder plus one <option> per item
function fillSelect(selectEl, items, placeholder) {
  selectEl.innerHTML = '';
  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  selectEl.appendChild(first);

  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    selectEl.appendChild(option);
  });
}

// Fetch the options file and populate both selects
async function loadSelectOptions() {
  try {
    const response = await fetch('/data/options.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    fillSelect(document.getElementById('country'), data.countries, 'Select a country');
    fillSelect(document.getElementById('course'), data.courses, 'Select a course');
  } catch (error) {
    console.error('Could not load select options:', error);
    showMessage('Could not load the country and course lists. Please refresh the page.');
    fillSelect(document.getElementById('country'), [], 'Unavailable');
    fillSelect(document.getElementById('course'), [], 'Unavailable');
  }
}

// ---------- Validation ----------

// Show or clear an error message under a field
function setFieldError(fieldName, message) {
  const field = form.elements[fieldName];
  // For radio groups, form.elements returns a RadioNodeList; use its first input
  const anchor = field instanceof RadioNodeList ? field[0] : field;
  const group = anchor.closest('.form-group');
  group.classList.toggle('has-error', Boolean(message));
  group.querySelector('.field-error').textContent = message || '';
}

// Returns true when every field is filled and valid
function validateForm() {
  let isValid = true;

  const textFields = {
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    address: 'Home address'
  };

  Object.entries(textFields).forEach(([name, label]) => {
    const empty = form.elements[name].value.trim() === '';
    setFieldError(name, empty ? `${label} is required.` : '');
    if (empty) isValid = false;
  });

  // Email: required and must look like an email
  const email = form.elements.email.value.trim();
  if (email === '') {
    setFieldError('email', 'Email is required.');
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError('email', 'Enter a valid email address.');
    isValid = false;
  } else {
    setFieldError('email', '');
  }

  // Date of birth
  const dobEmpty = form.elements.dateOfBirth.value === '';
  setFieldError('dateOfBirth', dobEmpty ? 'Date of birth is required.' : '');
  if (dobEmpty) isValid = false;

  // Age: required whole number between 10 and 100
  const ageValue = form.elements.age.value;
  const age = Number(ageValue);
  if (ageValue === '') {
    setFieldError('age', 'Age is required.');
    isValid = false;
  } else if (!Number.isInteger(age) || age < 10 || age > 100) {
    setFieldError('age', 'Age must be a whole number between 10 and 100.');
    isValid = false;
  } else {
    setFieldError('age', '');
  }

  // Select boxes
  ['country', 'course'].forEach((name) => {
    const empty = form.elements[name].value === '';
    setFieldError(name, empty ? 'Please choose an option.' : '');
    if (empty) isValid = false;
  });

  // Radio buttons: one must be chosen
  const genderEmpty = form.elements.gender.value === '';
  setFieldError('gender', genderEmpty ? 'Please select a gender.' : '');
  if (genderEmpty) isValid = false;

  // Image: required, correct type and size
  const file = form.elements.image.files[0];
  if (!file) {
    setFieldError('image', 'Please upload a photo.');
    isValid = false;
  } else if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    setFieldError('image', 'The photo must be a PNG, JPG, GIF or WEBP image.');
    isValid = false;
  } else if (file.size > MAX_IMAGE_SIZE) {
    setFieldError('image', 'The photo must be 2 MB or smaller.');
    isValid = false;
  } else {
    setFieldError('image', '');
  }

  return isValid;
}

// ---------- Messages ----------

function showMessage(text) {
  formMessage.textContent = text;
  formMessage.classList.remove('hidden');
}

function hideMessage() {
  formMessage.classList.add('hidden');
}

// ---------- Submission ----------

// Send the form (including the image) to the server
async function submitForm() {
  const response = await fetch('/api/students', {
    method: 'POST',
    body: new FormData(form) // multipart/form-data, needed for the file upload
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Could not save your details.');
  }
  return result;
}

async function handleSubmit(event) {
  event.preventDefault();
  hideMessage();

  if (!validateForm()) {
    showMessage('Please fix the highlighted fields and try again.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    await submitForm();
    window.location.href = '/students.html'; // success: go to the Students' Index page
  } catch (error) {
    // Failure: stay on this page and tell the user
    showMessage(`Submission failed: ${error.message}`);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

// ---------- Start ----------

form.addEventListener('submit', handleSubmit);
loadSelectOptions();
