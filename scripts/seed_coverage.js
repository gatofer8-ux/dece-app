const Database = require('better-sqlite3');
const db = new Database('data/dece.db');

try {
  db.exec("ALTER TABLE users ADD COLUMN coverage_courses TEXT");
} catch {}
try {
  db.exec("ALTER TABLE users ADD COLUMN job_title TEXT");
} catch {}
try {
  db.exec("ALTER TABLE professional_schedule_slots ADD COLUMN activity_type TEXT");
} catch {}
try {
  db.exec("ALTER TABLE professional_schedule_slots ADD COLUMN activity_title TEXT");
} catch {}

const standardCourses = JSON.stringify([
  'Inicial 1', 'Inicial 2', '1ro EGB (Preparatoria)',
  '2do EGB (Elemental)', '3ro EGB (Elemental)', '4to EGB (Elemental)',
  '5to EGB (Media)', '6to EGB (Media)', '7mo EGB (Media)',
  '8vo EGB (Superior)', '9no EGB (Superior)', '10mo EGB (Superior)',
  '1ro BGU (Bachillerato)', '2do BGU (Bachillerato)', '3ro BGU (Bachillerato)',
  '1ro BT (Técnico)', '2do BT (Técnico)', '3ro BT (Técnico)'
]);

db.prepare(`
  UPDATE users 
  SET coverage_courses = ?, job_title = 'Analista DECE'
  WHERE email = 'marlon.jacome@dece.edu.ec' OR role IN ('DECE', 'ADMIN')
`).run(standardCourses);

console.log('Seeded initial coverage courses successfully.');
