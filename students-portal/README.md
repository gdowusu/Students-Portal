# Students' Portal

A four-page web app: landing page, registration form, students index, and student details.

## Run it
Requires Node.js 22.5 or newer.

    npm install
    npm start

Then open http://localhost:3000

## Pages
| Page | File | Script |
|------|------|--------|
| Landing | public/index.html | - |
| Registration form | public/form.html | public/js/form.js |
| Students index | public/students.html | public/js/students.js |
| Student details | public/student.html | public/js/student.js |

All pages share public/css/style.css.

## How it works
- Select options (country, course) are fetched asynchronously from `public/data/options.json`.
- The form is validated in the browser and again on the server.
- Text details are saved in SQLite (`students.db`). The image is saved in `public/uploads/`
  and only its file name is stored in the database.
- On success the user is redirected to the students index; on failure they stay on the form
  and see an error message.
- The details page changes admission status asynchronously (PATCH request, no reload).
