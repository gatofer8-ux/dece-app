/**
 * Seed exhaustivo del Entorno de Demostración para el Sistema de Gestión DECE
 * Institución: Unidad Educativa Intercultural "Los Álamos" (demo-los-alamos)
 * Genera:
 * - Institución Ficticia
 * - Año Lectivo 2025-2026
 * - 4 Usuarios profesionales ficticios
 * - Distributivo DECE activo
 * - 100 Estudiantes ficticios de Inicial a Bachillerato con cédulas válidas (módulo 10)
 * - 38 Casos de vulnerabilidad distribuidos en las 10 tipologías aprobadas
 * - ~95 Acciones de bitácora (case_actions)
 * - 18 Entrevistas semiestructuradas
 * - 8 Fichas de observación áulica
 * - 12 Planes de atención psicosocial
 * - 6 Planes de restitución de derechos
 * - 6 Actas de socialización a docentes
 * - 4 Actas de asesoramiento a rectorado
 * - 5 Informes situacionales
 * - 14 Alertas docentes
 * - 35 Atenciones diarias de consejería
 * - 15 Citas programadas / atendidas
 * - 3 Consentimientos de círculos restaurativos
 * - 4 Reportes de juntas de curso
 */

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const path = require("path");

const DB_PATH = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "dece.db");
const db = new Database(DB_PATH);
db.pragma("foreign_keys = OFF"); // Disable during atomic reload of demo data

// Algoritmo módulo 10 para cédula ecuatoriana válida
function generateValidEcuadorianCedula(seq) {
  const prov = "17"; // Pichincha
  const third = "0";
  const numStr = String(100000 + (seq % 899999)).padStart(6, "0");
  const base9 = prov + third + numStr;
  const coefs = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(base9[i], 10) * coefs[i];
    if (val >= 10) val -= 9;
    sum += val;
  }
  const verifier = (10 - (sum % 10)) % 10;
  return base9 + verifier;
}

function runDemoSeed() {
  console.log("=== INICIANDO CARGA DEL ENTORNO DE DEMOSTRACIÓN (U.E. LOS ÁLAMOS) ===");

  const instId = "demo-los-alamos";
  const schoolYearId = "school-year-demo-2025-2026";
  const distributivoId = "distributivo-demo-2025-2026";

  // 1. Limpiar datos demo previos para idempotencia
  console.log("-> Limpiando registros previos de la institución demo...");
  const deleteTables = [
    "case_actions", "case_interviews", "case_observation_sheets", "case_care_plans",
    "case_restitution_plans", "socialization_acts", "authority_advisory_acts",
    "situational_reports", "case_corresponsibility_acts", "case_risk_matrix_entries",
    "case_files", "teacher_alerts", "daily_attentions", "appointments", "appointment_requests",
    "restorative_circle_consents", "course_board_reports", "students",
    "dece_distributivo_assignments", "dece_distributivos", "school_years"
  ];

  for (const t of deleteTables) {
    try {
      if (t === "case_actions") {
        db.prepare(`DELETE FROM case_actions WHERE case_file_id IN (SELECT id FROM case_files WHERE institution_id = ?)`).run(instId);
      } else {
        db.prepare(`DELETE FROM ${t} WHERE institution_id = ?`).run(instId);
      }
    } catch (e) {
      // Ignorar si columna institution_id no existe en la tabla
    }
  }

  // 2. Crear / Actualizar Institución Demo
  console.log("-> Creando institución educativa demo...");
  db.prepare(`
    INSERT OR REPLACE INTO institutions (
      id, name, amie_code, district, circuit, zona, address, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, '2025-08-15 08:00:00', '2025-08-15 08:00:00')
  `).run(
    instId,
    'Unidad Educativa Intercultural "Los Álamos"',
    '17H01999',
    '17D03',
    '17D03C04',
    'ZONA 9',
    'Av. Los Álamos N45-12 y Las Acacias, Sector La Delicia, Quito'
  );

  // 3. Crear Año Lectivo 2025-2026
  console.log("-> Configurando año lectivo 2025-2026...");
  db.prepare(`
    INSERT OR REPLACE INTO school_years (
      id, institution_id, name, regime, start_date, end_date, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, '2025-08-20 08:00:00', '2025-08-20 08:00:00')
  `).run(
    schoolYearId,
    instId,
    '2025-2026',
    'SIERRA_AMAZONIA',
    '2025-09-01',
    '2026-06-30'
  );

  // 4. Crear Usuarios Profesionales DECE para la institución Demo
  console.log("-> Registrando equipo profesional DECE demo...");
  const passHash = bcrypt.hashSync("dece2026", 10);

  const demoUsers = [
    {
      id: "user-demo-coord",
      name: "Mgs. Elena Rocío Paredes Viteri",
      email: "coordinacion.losalamos@dece.edu.ec",
      role: "ADMIN",
      phone: "0998412345"
    },
    {
      id: "user-demo-analista1",
      name: "Psic. Cl. Mateo Sebastián Alarcón Morales",
      email: "psicologia.losalamos@dece.edu.ec",
      role: "DECE",
      phone: "0997123456"
    },
    {
      id: "user-demo-analista2",
      name: "Lcda. Patricia Elizabeth Vega Caiza",
      email: "trabajosocial.losalamos@dece.edu.ec",
      role: "DECE",
      phone: "0996234567"
    },
    {
      id: "user-demo-rector",
      name: "Dr. Gonzalo Fernando Morales Espinosa",
      email: "rectorado.losalamos@dece.edu.ec",
      role: "AUTORIDAD",
      phone: "0995345678"
    },
    {
      id: "user-demo-docente",
      name: "Lic. Carlos Manuel Quishpe Andrango",
      email: "tutor.losalamos@dece.edu.ec",
      role: "DOCENTE",
      phone: "0994456789"
    }
  ];

  for (const u of demoUsers) {
    db.prepare(`
      INSERT OR REPLACE INTO users (
        id, institution_id, name, email, password_hash, role, phone, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, '2025-08-25 08:00:00', '2025-08-25 08:00:00')
    `).run(u.id, instId, u.name, u.email, passHash, u.role, u.phone);
  }

  // 5. Crear Distributivo DECE
  console.log("-> Configurando distributivo DECE y asignaciones...");
  db.prepare(`
    INSERT OR REPLACE INTO dece_distributivos (
      id, institution_id, school_year_id, school_year_text, title,
      coordinator_id, coordinator_name, is_active, elaborated_by_name,
      approved_by_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, '2025-09-01 08:00:00', '2025-09-01 08:00:00')
  `).run(
    distributivoId,
    instId,
    schoolYearId,
    "2025-2026",
    "Distributivo Institucional de Cobertura DECE",
    "user-demo-coord",
    "Mgs. Elena Rocío Paredes Viteri",
    "Mgs. Elena Rocío Paredes Viteri",
    "Dr. Gonzalo Fernando Morales Espinosa"
  );

  const assignments = [
    {
      id: randomUUID(),
      distributivo_id: distributivoId,
      user_id: "user-demo-coord",
      user_name: "Mgs. Elena Rocío Paredes Viteri",
      user_role_label: "COORDINADORA DECE",
      jornada: "Matutina",
      students_count: 850,
      subniveles: JSON.stringify(["Inicial", "Básica Elemental", "Básica Media", "Básica Superior", "Bachillerato"]),
      courses: JSON.stringify([]),
      parallels: JSON.stringify([])
    },
    {
      id: randomUUID(),
      distributivo_id: distributivoId,
      user_id: "user-demo-analista1",
      user_name: "Psic. Cl. Mateo Sebastián Alarcón Morales",
      user_role_label: "ANALISTA DECE (PSICOLOGÍA)",
      jornada: "Matutina",
      students_count: 450,
      subniveles: JSON.stringify(["Básica Superior", "Bachillerato"]),
      courses: JSON.stringify(["8.° EGB", "9.° EGB", "10.° EGB", "1.° BGU", "2.° BGU", "3.° BGU"]),
      parallels: JSON.stringify(["A", "B"])
    },
    {
      id: randomUUID(),
      distributivo_id: distributivoId,
      user_id: "user-demo-analista2",
      user_name: "Lcda. Patricia Elizabeth Vega Caiza",
      user_role_label: "ANALISTA DECE (TRABAJO SOCIAL)",
      jornada: "Matutina",
      students_count: 400,
      subniveles: JSON.stringify(["Inicial", "Básica Elemental", "Básica Media"]),
      courses: JSON.stringify(["Inicial 2", "1.° EGB", "2.° EGB", "3.° EGB", "4.° EGB", "5.° EGB", "6.° EGB", "7.° EGB"]),
      parallels: JSON.stringify(["A", "B"])
    }
  ];

  for (const a of assignments) {
    db.prepare(`
      INSERT OR REPLACE INTO dece_distributivo_assignments (
        id, distributivo_id, user_id, user_name, user_role_label, jornada,
        estimated_students_count, subniveles, courses, parallels, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2025-09-01 08:00:00', '2025-09-01 08:00:00')
    `).run(
      a.id, a.distributivo_id, a.user_id, a.user_name, a.user_role_label, a.jornada,
      a.students_count, a.subniveles, a.courses, a.parallels
    );
  }

  // 6. Generación de 100 Estudiantes Ficticios
  console.log("-> Generando 100 estudiantes ficticios estructurados por subniveles...");

  const NOMBRES_HOMBRES = [
    "Carlos Andrés", "Mateo Sebastián", "Dylan Alexander", "Erick David", "Kevin Daniel",
    "Juan Fernando", "Josué Isaac", "Gabriel Alejandro", "Diego Leonardo", "Bryan Paul",
    "Santiago Nicolás", "Martín Eduardo", "Lucas Benjamín", "Ángel Gabriel", "Emilio José",
    "Christian David", "Anthony Marcelo", "Justin Ariel", "Alan Fabricio", "Leonardo Jesús",
    "Isaac Patricio", "Joaquín Damián", "Esteban Rodrigo", "Mathías Javier", "Axel Francisco"
  ];

  const NOMBRES_MUJERES = [
    "Doménica Sofía", "Camila Valentina", "Emily Nicole", "Valeria Cristina", "Melany Anahí",
    "Paula Antonella", "Allison Dayana", "Fiorella Monserrath", "Danna Isabella", "María José",
    "Giselle Alejandra", "Scarlett Naomi", "Renata Victoria", "Ariana Lisbeth", "Britany Nicole",
    "Génesis Carolina", "Bianca Samanta", "Romina Estefanía", "Daniela Belén", "Luciana Salomé",
    "Julieta Mikaela", "Mia Florencia", "Martina Sophia", "Zoe Abigail", "Pamela Karina"
  ];

  const APELLIDOS = [
    "Mendoza Morales", "Alarcón Villavicencio", "Cárdenas Freire", "Santillán Cevallos",
    "Chávez Guanoluisa", "Paredes Viteri", "Montenegro Carrera", "Enríquez Benítez",
    "Guerrero Salazar", "Toapanta Calvache", "Zambrano Moreira", "Castillo Peñafiel",
    "Herrera Cisneros", "Narváez Velasco", "Barreno Villacís", "Cevallos Quintana",
    "Maldonado Andrade", "Llumiquinga Tipán", "Cajamarca Pilataxi", "Bustamante Carrión",
    "Ortega Vallejo", "Galarza Rosero", "Chiluisa Guamán", "Paucar Soria",
    "Gualoto Quinatoa", "Samaniego Zurita", "Valencia Córdova", "Jaramillo Campoverde"
  ];

  const gradePlan = [
    { level: "INICIAL", course: "Inicial 2", parallel: "A", age: 4, birthYear: 2021, count: 8, spec: null },
    { level: "EGB", course: "1.° EGB", parallel: "A", age: 5, birthYear: 2020, count: 8, spec: null },
    { level: "EGB", course: "2.° EGB", parallel: "A", age: 6, birthYear: 2019, count: 4, spec: null },
    { level: "EGB", course: "2.° EGB", parallel: "B", age: 6, birthYear: 2019, count: 4, spec: null },
    { level: "EGB", course: "3.° EGB", parallel: "A", age: 7, birthYear: 2018, count: 4, spec: null },
    { level: "EGB", course: "3.° EGB", parallel: "B", age: 7, birthYear: 2018, count: 4, spec: null },
    { level: "EGB", course: "4.° EGB", parallel: "A", age: 8, birthYear: 2017, count: 4, spec: null },
    { level: "EGB", course: "4.° EGB", parallel: "B", age: 8, birthYear: 2017, count: 4, spec: null },
    { level: "EGB", course: "5.° EGB", parallel: "A", age: 9, birthYear: 2016, count: 4, spec: null },
    { level: "EGB", course: "5.° EGB", parallel: "B", age: 9, birthYear: 2016, count: 4, spec: null },
    { level: "EGB", course: "6.° EGB", parallel: "A", age: 10, birthYear: 2015, count: 4, spec: null },
    { level: "EGB", course: "6.° EGB", parallel: "B", age: 10, birthYear: 2015, count: 4, spec: null },
    { level: "EGB", course: "7.° EGB", parallel: "A", age: 11, birthYear: 2014, count: 4, spec: null },
    { level: "EGB", course: "7.° EGB", parallel: "B", age: 11, birthYear: 2014, count: 4, spec: null },
    { level: "EGB", course: "8.° EGB", parallel: "A", age: 12, birthYear: 2013, count: 4, spec: null },
    { level: "EGB", course: "8.° EGB", parallel: "B", age: 12, birthYear: 2013, count: 3, spec: null },
    { level: "EGB", course: "9.° EGB", parallel: "A", age: 13, birthYear: 2012, count: 4, spec: null },
    { level: "EGB", course: "9.° EGB", parallel: "B", age: 13, birthYear: 2012, count: 3, spec: null },
    { level: "EGB", course: "10.° EGB", parallel: "A", age: 14, birthYear: 2011, count: 3, spec: null },
    { level: "EGB", course: "10.° EGB", parallel: "B", age: 14, birthYear: 2011, count: 3, spec: null },
    { level: "BACHILLERATO", course: "1.° BGU", parallel: "A", age: 15, birthYear: 2010, count: 3, spec: "Ciencias" },
    { level: "BACHILLERATO", course: "1.° BGU", parallel: "B", age: 15, birthYear: 2010, count: 3, spec: "Técnico en Informática" },
    { level: "BACHILLERATO", course: "2.° BGU", parallel: "A", age: 16, birthYear: 2009, count: 3, spec: "Ciencias" },
    { level: "BACHILLERATO", course: "2.° BGU", parallel: "B", age: 16, birthYear: 2009, count: 2, spec: "Técnico en Informática" },
    { level: "BACHILLERATO", course: "3.° BGU", parallel: "A", age: 17, birthYear: 2008, count: 3, spec: "Ciencias" },
    { level: "BACHILLERATO", course: "3.° BGU", parallel: "B", age: 17, birthYear: 2008, count: 2, spec: "Técnico en Informática" }
  ];

  const studentsList = [];
  let globalStudentSeq = 1;

  for (const grp of gradePlan) {
    for (let i = 0; i < grp.count; i++) {
      const isFemale = (globalStudentSeq % 2 === 0);
      const namePool = isFemale ? NOMBRES_MUJERES : NOMBRES_HOMBRES;
      const firstName = namePool[(globalStudentSeq * 7) % namePool.length];
      const lastName = APELLIDOS[(globalStudentSeq * 11) % APELLIDOS.length];
      const fullName = `${lastName} ${firstName}`;

      const cedula = generateValidEcuadorianCedula(globalStudentSeq * 137);
      const birthMonth = String((globalStudentSeq % 12) + 1).padStart(2, "0");
      const birthDay = String((globalStudentSeq % 26) + 1).padStart(2, "0");
      const birthDate = `${grp.birthYear}-${birthMonth}-${birthDay}`;

      const fatherName = `Sr. ${lastName.split(" ")[0]} Gonzalo ${APELLIDOS[(globalStudentSeq + 3) % APELLIDOS.length].split(" ")[0]}`;
      const motherName = `Sra. ${lastName.split(" ")[1] || "Morales"} Mariana ${APELLIDOS[(globalStudentSeq + 5) % APELLIDOS.length].split(" ")[0]}`;
      const rep = isFemale ? motherName : fatherName;
      const repPhone = `099${String(1000000 + (globalStudentSeq * 7919) % 8999999)}`;

      const studentId = `student-demo-${String(globalStudentSeq).padStart(3, "0")}`;

      const stRow = {
        id: studentId,
        institution_id: instId,
        full_name: fullName,
        document_id: cedula,
        birth_date: birthDate,
        gender: isFemale ? "FEMENINO" : "MASCULINO",
        course: grp.course,
        parallel: grp.parallel,
        representative: rep,
        rep_phone: repPhone,
        rep_email: `familia.${lastName.split(" ")[0].toLowerCase()}.${globalStudentSeq}@correo.ec`,
        address: `Barrio San Antonio, Calle Los Nogales y Pinos Lote ${globalStudentSeq}, Quito`,
        ethnicity: globalStudentSeq % 15 === 0 ? "INDIGENA" : "MESTIZO",
        nationality: "ECUATORIANA",
        active: 1,
        birth_country: "ECUADOR",
        birth_province: "PICHINCHA",
        birth_canton: "QUITO",
        birth_parish: "COTOCOLLAO",
        jornada: grp.parallel === "B" && grp.level === "EGB" && grp.age >= 9 ? "VESPERTINA" : "MATUTINA",
        education_level: grp.level,
        bachillerato_specialty: grp.spec,
        neighborhood: "San Antonio de Pichincha",
        lives_with: globalStudentSeq % 5 === 0 ? "MADRE" : (globalStudentSeq % 9 === 0 ? "ABUELITA" : "PADRES"),
        legal_guardian: isFemale ? "MADRE" : "PADRE",
        father_name: fatherName,
        father_phone: `098${String(2000000 + (globalStudentSeq * 6131) % 7999999)}`,
        mother_name: motherName,
        mother_phone: `097${String(3000000 + (globalStudentSeq * 4129) % 6999999)}`,
        age: grp.age
      };

      db.prepare(`
        INSERT INTO students (
          id, institution_id, full_name, document_id, birth_date, gender, course, parallel,
          representative, rep_phone, rep_email, address, ethnicity, nationality, active,
          birth_country, birth_province, birth_canton, birth_parish, jornada, education_level,
          bachillerato_specialty, neighborhood, lives_with, legal_guardian, father_name,
          father_phone, mother_name, mother_phone, created_at, updated_at
        ) VALUES (
          @id, @institution_id, @full_name, @document_id, @birth_date, @gender, @course, @parallel,
          @representative, @rep_phone, @rep_email, @address, @ethnicity, @nationality, @active,
          @birth_country, @birth_province, @birth_canton, @birth_parish, @jornada, @education_level,
          @bachillerato_specialty, @neighborhood, @lives_with, @legal_guardian, @father_name,
          @father_phone, @mother_name, @mother_phone, '2025-09-02 08:00:00', '2025-09-02 08:00:00'
        )
      `).run(stRow);

      studentsList.push(stRow);
      globalStudentSeq++;
    }
  }

  console.log(`-> ${studentsList.length} estudiantes ficticios insertados exitosamente.`);

  // 7. Generación de 38 Casos de Vulnerabilidad
  console.log("-> Generando 38 casos de vulnerabilidad con tipologías oficiales...");

  const caseSpecs = [
    // 1. Violencia Intrafamiliar (5 casos)
    {
      studentIdx: 52, // 8.° EGB
      risk_type: "VIOLENCIA_INTRAFAMILIAR",
      risk_type_other: null,
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-09-18",
      detection_source: "Docente tutor",
      assigned_to: "user-demo-analista1",
      desc: "Estudiante presenta hematomas leves en antebrazo y notable decaimiento anímico. Manifiesta castigos físicos severos en el hogar por bajo rendimiento en matemáticas. Se activa protocolo de violencia intrafamiliar y coordinación con Junta Cantonal."
    },
    {
      studentIdx: 71, // 10.° EGB
      risk_type: "VIOLENCIA_INTRAFAMILIAR",
      risk_type_other: null,
      priority: "ALTA",
      status: "ABIERTO",
      detection_date: "2026-03-12",
      detection_source: "Detección directa DECE",
      assigned_to: "user-demo-analista1",
      desc: "Estudiante acude al DECE en crisis de llanto refiriendo agresiones verbales sistemáticas y amenazas de expulsión del hogar por parte de su padrastro. Se convoca a la madre de forma urgente y se redacta informe de medidas de protección."
    },
    {
      studentIdx: 28, // 5.° EGB
      risk_type: "VIOLENCIA_INTRAFAMILIAR",
      risk_type_other: null,
      priority: "ALTA",
      status: "DERIVADO",
      detection_date: "2025-10-08",
      detection_source: "Docente de aula",
      assigned_to: "user-demo-analista2",
      desc: "Evidencia de maltrato físico y verbal recurrente con vulneración flagrante a su integridad. Caso remitido formalmente a la Junta Cantonal de Protección de Derechos mediante oficio reservado con medidas de alejamiento temporal."
    },
    {
      studentIdx: 39, // 6.° EGB
      risk_type: "VIOLENCIA_INTRAFAMILIAR",
      risk_type_other: null,
      priority: "MEDIA",
      status: "CERRADO",
      detection_date: "2025-09-25",
      detection_source: "Representante legal (Madre)",
      assigned_to: "user-demo-analista2",
      desc: "Conflicto conyugal con afectación emocional al estudiante. Tras 8 sesiones de acompañamiento psicosocial familiar y derivación al Centro de Salud Tipo C, se evidencia estabilidad emocional y cese total de conductas violentas."
    },
    {
      studentIdx: 85, // 2.° BGU
      risk_type: "VIOLENCIA_INTRAFAMILIAR",
      risk_type_other: null,
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-11-14",
      detection_source: "Docente tutor",
      assigned_to: "user-demo-analista1",
      desc: "Situación de violencia psicológica en el hogar con restricciones extremas de alimentos y aislamiento forzado. Se mantiene plan de acompañamiento activo con entrevistas quincenales y red de apoyo con tía materna."
    },

    // 2. Violencia Escolar / Bullying / Ciberacoso (5 casos)
    {
      studentIdx: 64, // 9.° EGB
      risk_type: "VIOLENCIA_ESCOLAR_BULLYING",
      risk_type_other: null,
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-10-15",
      detection_source: "Ficha de alerta docente",
      assigned_to: "user-demo-analista1",
      desc: "Acoso escolar reiterado y exclusión sistemática por parte de un grupo de compañeros durante los recesos y en grupo de mensajería instantánea. Se implementa círculo restaurativo, actas de socialización docente y plan de contención."
    },
    {
      studentIdx: 44, // 7.° EGB
      risk_type: "VIOLENCIA_ESCOLAR_BULLYING",
      risk_type_other: null,
      priority: "MEDIA",
      status: "ABIERTO",
      detection_date: "2026-02-20",
      detection_source: "Representante legal",
      assigned_to: "user-demo-analista2",
      desc: "Apodos despectivos y burlas constantes sobre su apariencia física dentro del aula. La estudiante manifiesta fobia escolar y resistencia a ingresar a clases de Educación Física. Se programan observaciones de aula."
    },
    {
      studentIdx: 90, // 3.° BGU
      risk_type: "VIOLENCIA_ESCOLAR_BULLYING",
      risk_type_other: null,
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-11-03",
      detection_source: "Estudiante (Autoderivación)",
      assigned_to: "user-demo-analista1",
      desc: "Ciberacoso mediante creación de perfiles falsos en redes sociales con memes difamatorios. Se identifican estudiantes involucrados, se ejecuta acta de compromiso disciplinario con padres y talleres de uso responsable de TIC."
    },
    {
      studentIdx: 19, // 4.° EGB
      risk_type: "VIOLENCIA_ESCOLAR_BULLYING",
      risk_type_other: null,
      priority: "MEDIA",
      status: "CERRADO",
      detection_date: "2025-10-22",
      detection_source: "Docente de grado",
      assigned_to: "user-demo-analista2",
      desc: "Intimidación física menor y sustracción reiterada de útiles escolares en el aula. Intervención exitosa con círculos de convivencia, acuerdos suscritos entre representantes y tutoría grupal de valores."
    },
    {
      studentIdx: 58, // 8.° EGB
      risk_type: "VIOLENCIA_ESCOLAR_BULLYING",
      risk_type_other: null,
      priority: "MEDIA",
      status: "ABIERTO",
      detection_date: "2026-04-05",
      detection_source: "Docente tutor",
      assigned_to: "user-demo-analista1",
      desc: "Empujones y agresiones verbales recurrentes en cambios de hora. Se realiza indagación inicial, entrevista individual con presuntos agresores y estudiante afectado para establecer medidas de protección inmediata."
    },

    // 3. Dificultades de Aprendizaje / NEE (5 casos)
    {
      studentIdx: 15, // 3.° EGB
      risk_type: "DIFICULTAD_APRENDIZAJE",
      risk_type_other: null,
      priority: "MEDIA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-09-30",
      detection_source: "Junta de curso",
      assigned_to: "user-demo-analista2",
      desc: "Sospecha de dislexia y disgrafía. El estudiante presenta severo retraso en lectoescritura e inversión de grafemas. Se coordina evaluación psicopedagógica con UDAFE y se solicita adaptación curricular grado 2."
    },
    {
      studentIdx: 33, // 6.° EGB
      risk_type: "DIFICULTAD_APRENDIZAJE",
      risk_type_other: null,
      priority: "MEDIA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-10-12",
      detection_source: "Docente tutor",
      assigned_to: "user-demo-analista2",
      desc: "Diagnóstico confirmado de TDAH subtipo combinado. Dificultades de atención sostenida y desregulación de impulsos en clase. Socialización de estrategias pedagógicas y tiempos de respuesta extendidos en evaluaciones."
    },
    {
      studentIdx: 68, // 9.° EGB
      risk_type: "DIFICULTAD_APRENDIZAJE",
      risk_type_other: null,
      priority: "BAJA",
      status: "CERRADO",
      detection_date: "2025-09-10",
      detection_source: "Informe UDAFE anterior",
      assigned_to: "user-demo-analista1",
      desc: "Dificultad específica en razonamiento lógico matemático (discalculia leve). Se implementaron tutorías pedagógicas personalizadas y material concreto. Rendimiento académico nivelado satisfactoriamente."
    },
    {
      studentIdx: 23, // 4.° EGB
      risk_type: "DIFICULTAD_APRENDIZAJE",
      risk_type_other: null,
      priority: "MEDIA",
      status: "ABIERTO",
      detection_date: "2026-03-05",
      detection_source: "Docente de grado",
      assigned_to: "user-demo-analista2",
      desc: "Bloqueo comprensivo lector y bajo rendimiento generalizado. Se inicia ficha de observación áulica y entrevista anamnésica con la madre para descartar factores neurológicos o sensoriales."
    },
    {
      studentIdx: 79, // 1.° BGU
      risk_type: "DIFICULTAD_APRENDIZAJE",
      risk_type_other: null,
      priority: "MEDIA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-11-20",
      detection_source: "Junta de curso 1T",
      assigned_to: "user-demo-analista1",
      desc: "NEE no asociada a discapacidad: ritmo de aprendizaje significativamente lento en asignaturas técnicas. Plan de acompañamiento pedagógico con docentes de informática y seguimiento bimensual."
    },

    // 4. Salud Mental / Crisis Emocional / Ideación Autolítica (4 casos)
    {
      studentIdx: 75, // 10.° EGB
      risk_type: "SALUD_MENTAL",
      risk_type_other: null,
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-10-28",
      detection_source: "Compañera de curso / DECE",
      assigned_to: "user-demo-analista1",
      desc: "Presencia de cortes superficiales en antebrazos (autolesión no suicida) y verbalización de desesperanza vital. Se activa protocolo de salud mental y prevención de suicidio, suscripción de acta de corresponsabilidad y atención en MSP."
    },
    {
      studentIdx: 82, // 1.° BGU
      risk_type: "SALUD_MENTAL",
      risk_type_other: null,
      priority: "ALTA",
      status: "ABIERTO",
      detection_date: "2026-04-18",
      detection_source: "Docente tutor",
      assigned_to: "user-demo-analista1",
      desc: "Crisis de angustia y ataque de pánico recurrente en horas de clase. La estudiante expresa sentirse sobrecargada emocionalmente con aislamiento social progresivo. Contención en crisis e intervención familiar urgente."
    },
    {
      studentIdx: 94, // 3.° BGU
      risk_type: "SALUD_MENTAL",
      risk_type_other: null,
      priority: "ALTA",
      status: "DERIVADO",
      detection_date: "2025-12-02",
      detection_source: "Detección directa DECE",
      assigned_to: "user-demo-analista1",
      desc: "Ideación autolítica activa con plan estructurado expresado en diario personal. Derivación inmediata y prioritaria a psiquiatría infantil del Hospital Pediátrico Baca Ortiz con acompañamiento permanente de los padres."
    },
    {
      studentIdx: 61, // 9.° EGB
      risk_type: "SALUD_MENTAL",
      risk_type_other: null,
      priority: "MEDIA",
      status: "CERRADO",
      detection_date: "2025-09-15",
      detection_source: "Representante legal",
      assigned_to: "user-demo-analista1",
      desc: "Trastorno de adaptación con sintomatología depresiva tras duelo por fallecimiento súbito de abuela materna. Proceso de psicoterapia externa concluido con éxito y reinserción plena a actividades escolares."
    },

    // 5. Consumo Problemático de Sustancias (SPA) (4 casos)
    {
      studentIdx: 87, // 2.° BGU
      risk_type: "CONSUMO_SUSTANCIAS",
      risk_type_other: null,
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-11-10",
      detection_source: "Inspección General",
      assigned_to: "user-demo-analista1",
      desc: "Presunción de porte y consumo de sustancias catalogadas sujetas a fiscalización en los exteriores del plantel. Se activa protocolo de drogas, abordaje no punitivo, notificación a representantes y derivación a centro de salud tipo C."
    },
    {
      studentIdx: 92, // 3.° BGU
      risk_type: "CONSUMO_SUSTANCIAS",
      risk_type_other: null,
      priority: "ALTA",
      status: "ABIERTO",
      detection_date: "2026-03-22",
      detection_source: "Docente de química",
      assigned_to: "user-demo-analista1",
      desc: "Estudiante ingresa a jornada escolar con aliento a licor y somnolencia excesiva. Se convoca a representante, se firma acta de compromiso y se inicia proceso de valoración psicosocial y plan de deshabituación."
    },
    {
      studentIdx: 73, // 10.° EGB
      risk_type: "CONSUMO_SUSTANCIAS",
      risk_type_other: null,
      priority: "MEDIA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2026-01-14",
      detection_source: "Representante legal",
      assigned_to: "user-demo-analista1",
      desc: "Consumo experimental de cigarrillos electrónicos (vapeadores) con nicotina y líquidos aromatizados dentro de los baños. Vinculación a programa preventivo grupal y proyecto de vida."
    },
    {
      studentIdx: 98, // 3.° BGU
      risk_type: "CONSUMO_SUSTANCIAS",
      risk_type_other: null,
      priority: "MEDIA",
      status: "CERRADO",
      detection_date: "2025-09-20",
      detection_source: "Inspección General",
      assigned_to: "user-demo-analista1",
      desc: "Consumo esporádico de alcohol en fiestas de fin de semana con bajo rendimiento académico inicial. Completó 6 talleres de prevención de adicciones en MSP y mantiene abstinencia verificada."
    },

    // 6. Negligencia Parental / Vulneración de Derechos (4 casos)
    {
      studentIdx: 11, // 2.° EGB
      risk_type: "OTRO",
      risk_type_other: "Negligencia parental / Descuido en el cuidado integral",
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-10-05",
      detection_source: "Docente de grado",
      assigned_to: "user-demo-analista2",
      desc: "Estudiante asiste de forma reiterada sin colación escolar, con uniforme sucio y sin control médico evidente. Progenitores desatienden convocatorias del DECE. Se realiza visita domiciliaria y acta con Trabajo Social."
    },
    {
      studentIdx: 49, // 7.° EGB
      risk_type: "OTRO",
      risk_type_other: "Trabajo infantil que interfiere con la escolaridad",
      priority: "ALTA",
      status: "ABIERTO",
      detection_date: "2026-02-15",
      detection_source: "Docente tutor",
      assigned_to: "user-demo-analista2",
      desc: "Estudiante de 11 años es obligado a vender golosinas en el terminal de buses hasta altas horas de la noche, provocando somnolencia y retrasos diarios. Coordinación con DINA PEN y MIES para inclusión en bonos de apoyo."
    },
    {
      studentIdx: 7, // 1.° EGB
      risk_type: "OTRO",
      risk_type_other: "Negligencia en salud y vacunación",
      priority: "MEDIA",
      status: "CERRADO",
      detection_date: "2025-09-28",
      detection_source: "Docente de inicial",
      assigned_to: "user-demo-analista2",
      desc: "Falta de esquema de vacunación y desatención odontológica severa. Tras asesoramiento del DECE, la madre regularizó los controles pediátricos en el subcentro de salud."
    },
    {
      studentIdx: 36, // 6.° EGB
      risk_type: "VULNERACION_DERECHOS",
      risk_type_other: null,
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-11-28",
      detection_source: "Ficha de alerta docente",
      assigned_to: "user-demo-analista2",
      desc: "Retención indebida de documentos de identidad por parte de familiares paternos y privación de libertad ambulatoria los fines de semana. Seguimiento conjunto con Defensoría del Pueblo."
    },

    // 7. Conflicto Familiar / Desestructuración del Hogar (3 casos)
    {
      studentIdx: 42, // 6.° EGB
      risk_type: "CONFLICTO_FAMILIAR",
      risk_type_other: null,
      priority: "MEDIA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-10-18",
      detection_source: "Representante legal",
      assigned_to: "user-demo-analista2",
      desc: "Proceso judicial contencioso de divorcio y régimen de visitas entre los progenitores con discusiones violentas en la puerta del colegio. Se establece protocolo de entrega segura y acta de corresponsabilidad."
    },
    {
      studentIdx: 66, // 9.° EGB
      risk_type: "CONFLICTO_FAMILIAR",
      risk_type_other: null,
      priority: "MEDIA",
      status: "ABIERTO",
      detection_date: "2026-03-30",
      detection_source: "Estudiante",
      assigned_to: "user-demo-analista1",
      desc: "Impacto psicosocial por migración irregular reciente de la madre hacia el extranjero. El estudiante queda al cuidado de un hermano mayor de 19 años con desorganización de horarios y desmotivación."
    },
    {
      studentIdx: 17, // 3.° EGB
      risk_type: "CONFLICTO_FAMILIAR",
      risk_type_other: null,
      priority: "BAJA",
      status: "CERRADO",
      detection_date: "2025-09-22",
      detection_source: "Docente de aula",
      assigned_to: "user-demo-analista2",
      desc: "Dificultades de adaptación por conformación de nueva familia reconstituida. Orientación familiar brindada por el DECE en 4 sesiones, logrando acuerdos de convivencia armoniosa."
    },

    // 8. Ausentismo Escolar Recurrente / Riesgo de Abandono (3 casos)
    {
      studentIdx: 77, // 10.° EGB
      risk_type: "OTRO",
      risk_type_other: "Ausentismo reiterado y riesgo de abandono escolar",
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-11-05",
      detection_source: "Inspección General",
      assigned_to: "user-demo-analista1",
      desc: "Más de 25 faltas injustificadas en el primer trimestre. El estudiante manifiesta desinterés por los estudios y presión económica familiar. Visita domiciliaria y plan de nivelación para evitar deserción."
    },
    {
      studentIdx: 54, // 8.° EGB
      risk_type: "OTRO",
      risk_type_other: "Ausentismo reiterado por lejanía geográfica",
      priority: "MEDIA",
      status: "ABIERTO",
      detection_date: "2026-04-10",
      detection_source: "Docente tutor",
      assigned_to: "user-demo-analista1",
      desc: "Faltas frecuentes los días lunes y viernes por carencia de recursos para transporte desde zona rural. Gestión interinstitucional para transporte escolar y material pedagógico flexible."
    },
    {
      studentIdx: 26, // 4.° EGB
      risk_type: "OTRO",
      risk_type_other: "Ausentismo escolar por enfermedad no catastrófica",
      priority: "BAJA",
      status: "CERRADO",
      detection_date: "2025-10-10",
      detection_source: "Representante legal",
      assigned_to: "user-demo-analista2",
      desc: "Inasistencias prolongadas por asma bronquial infantil. Se coordinó plan pedagógico de contingencia en casa y reincorporación exitosa al aula regular."
    },

    // 9. Embarazo y Paternidad Adolescente (3 casos)
    {
      studentIdx: 96, // 3.° BGU
      risk_type: "EMBARAZO_ADOLESCENTE",
      risk_type_other: null,
      priority: "ALTA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-10-14",
      detection_source: "Estudiante (confidencial)",
      assigned_to: "user-demo-analista1",
      desc: "Estudiante de 17 años en segundo trimestre de gestación. Implementación inmediata de la guía de prevención y atención del embarazo en niñas y adolescentes: adaptaciones curriculares, citas prenatales justificadas y contención socioafectiva."
    },
    {
      studentIdx: 84, // 1.° BGU
      risk_type: "EMBARAZO_ADOLESCENTE",
      risk_type_other: null,
      priority: "ALTA",
      status: "ABIERTO",
      detection_date: "2026-03-18",
      detection_source: "Representante legal",
      assigned_to: "user-demo-analista1",
      desc: "Estudiante de 15 años en primer trimestre de embarazo confirmado por ecografía. Se suscribe plan de continuidad educativa y se socializan lineamientos con el equipo docente para evitar discriminación."
    },
    {
      studentIdx: 99, // 3.° BGU
      risk_type: "OTRO",
      risk_type_other: "Paternidad adolescente y permanencia escolar",
      priority: "MEDIA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-11-12",
      detection_source: "Estudiante",
      assigned_to: "user-demo-analista1",
      desc: "Estudiante asume paternidad activa con necesidad de compatibilizar estudios y turnos laborales de medio tiempo. Flexibilidad en horarios de entrega y proyecto de vida vocacional."
    },

    // 10. Situación de Discapacidad (2 casos)
    {
      studentIdx: 47, // 7.° EGB
      risk_type: "OTRO",
      risk_type_other: "Situación de discapacidad auditiva moderada",
      priority: "MEDIA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-09-08",
      detection_source: "Matrícula ordinaria / UDAFE",
      assigned_to: "user-demo-analista2",
      desc: "Estudiante cuenta con carné de discapacidad auditiva (42%). Requiere ubicación preferencial en la primera fila, lenguaje claro de frente para lectura labiofacial y apoyo visual en todas las materias."
    },
    {
      studentIdx: 89, // 2.° BGU
      risk_type: "OTRO",
      risk_type_other: "Situación de discapacidad motriz (parálisis cerebral espástica leve)",
      priority: "MEDIA",
      status: "EN_SEGUIMIENTO",
      detection_date: "2025-09-08",
      detection_source: "Matrícula ordinaria",
      assigned_to: "user-demo-analista1",
      desc: "Dificultad de motricidad fina y marcha lenta. Adaptación de mobiliario ergonómico en aula, reubicación del paralelo a planta baja y adaptación de pruebas escritas a formatos digitales."
    }
  ];

  const createdCases = [];

  caseSpecs.forEach((spec, idx) => {
    const caseSeq = idx + 1;
    const caseId = `case-demo-${String(caseSeq).padStart(3, "0")}`;
    const code = `DECE-2025-${String(caseSeq).padStart(4, "0")}`;
    const targetStudent = studentsList[spec.studentIdx - 1] || studentsList[0];

    const isClosed = spec.status === "CERRADO";
    const closedAt = isClosed ? "2026-01-20 12:00:00" : null;
    const closureReason = isClosed ? "Objetivos del plan de atención cumplidos satisfactoriamente con resolución de factores de riesgo." : null;

    db.prepare(`
      INSERT INTO case_files (
        id, institution_id, code, student_id, opened_by_id, assigned_to_id,
        status, priority, action_axis, risk_type, risk_type_other,
        detection_date, detection_source, description, confidential,
        closed_at, closure_reason, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, 1,
        ?, ?, ?, ?
      )
    `).run(
      caseId,
      instId,
      code,
      targetStudent.id,
      "user-demo-coord",
      spec.assigned_to,
      spec.status,
      spec.priority,
      spec.status === "EN_SEGUIMIENTO" ? "SEGUIMIENTO" : "ATENCION",
      spec.risk_type,
      spec.risk_type_other,
      spec.detection_date + " 09:00:00",
      spec.detection_source,
      spec.desc,
      closedAt,
      closureReason,
      spec.detection_date + " 09:30:00",
      "2026-05-15 11:00:00"
    );

    createdCases.push({
      id: caseId,
      code,
      student: targetStudent,
      spec
    });
  });

  console.log(`-> ${createdCases.length} casos de vulnerabilidad creados con éxito.`);

  // 8. Generación de Acciones de Bitácora (case_actions) (~95 acciones)
  console.log("-> Generando historial cronológico de acciones de bitácora...");

  let actionCount = 0;
  createdCases.forEach((c) => {
    const a1Date = c.spec.detection_date;
    db.prepare(`
      INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      c.id,
      c.spec.assigned_to,
      a1Date + " 10:00:00",
      "Detección y recepción de alerta",
      `Apertura del expediente institucional tras recepción del reporte por parte de ${c.spec.detection_source}. Se registra información preliminar y se establece cita de valoración.`,
      a1Date + " 10:15:00"
    );
    actionCount++;

    db.prepare(`
      INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      c.id,
      c.spec.assigned_to,
      a1Date + " 14:30:00",
      "Entrevista individual",
      `Aplicación de entrevista semiestructurada al estudiante ${c.student.full_name}. Se indagan antecedentes emocionales, dinámica escolar y red de apoyo familiar.`,
      a1Date + " 15:30:00"
    );
    actionCount++;

    if (c.spec.status !== "ABIERTO") {
      db.prepare(`
        INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        c.id,
        c.spec.assigned_to,
        "2025-11-20 11:00:00",
        "Entrevista a representante legal",
        `Comparecencia de ${c.student.representative}. Se informan los hallazgos psicosociales, se suscribe acta de compromiso y se coordinan acciones conjuntas de protección.`,
        "2025-11-20 12:00:00"
      );
      actionCount++;
    }

    if (c.spec.status === "CERRADO") {
      db.prepare(`
        INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        c.id,
        c.spec.assigned_to,
        "2026-01-20 11:30:00",
        "Informe de cierre y seguimiento final",
        `Evaluación satisfactoria de los indicadores de bienestar integral. Se procede al cierre del expediente DECE con recomendaciones de mantenimiento preventivo.`,
        "2026-01-20 12:00:00"
      );
      actionCount++;
    }
  });

  console.log(`-> ${actionCount} acciones de bitácora registradas.`);

  // 9. Entrevistas Semiestructuradas (case_interviews) (18 fichas)
  console.log("-> Generando 18 entrevistas semiestructuradas oficiales...");
  for (let i = 0; i < 18; i++) {
    const c = createdCases[i];
    const interviewId = `interview-demo-${String(i + 1).padStart(3, "0")}`;
    db.prepare(`
      INSERT INTO case_interviews (
        id, case_file_id, institution_id, interviewee_full_name, interviewee_cedula,
        course, age, application_date, family_relation, emotional_state,
        social_relations, bullying_history, academic_history, summary,
        recommendations, commitment, representative_name, professional_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      interviewId,
      c.id,
      instId,
      c.student.full_name,
      c.student.document_id,
      `${c.student.course} "${c.student.parallel}"`,
      String(c.student.age),
      c.spec.detection_date,
      `Convive con ${c.student.lives_with}. La comunicación intrafamiliar presenta momentos de tensión por expectativas académicas.`,
      "Estudiante receptivo, con niveles leves a moderados de ansiedad situacional y adecuada orientación temporoespacial.",
      "Mantiene relación cordial con un grupo reducido de pares; tiende a retraerse en situaciones multitudinarias.",
      c.spec.risk_type.includes("BULLYING") ? 1 : 0,
      "Rendimiento promedio de 7.5/10 con dificultades concentradas en áreas analíticas.",
      `Entrevista orientada a explorar la problemática de ${c.spec.risk_type.toLowerCase().replace(/_/g, " ")}. El estudiante verbaliza sus emociones con franqueza.`,
      "1. Seguimiento quincenal en DECE.\n2. Inclusión en actividades socioemocionales de aula.\n3. Comunicación fluida con tutor.",
      "El estudiante se compromete a acudir semanalmente a las sesiones de consejería y comunicar cualquier incidente a su tutor.",
      c.student.representative,
      c.spec.assigned_to,
      c.spec.detection_date + " 15:00:00"
    );
  }

  // 10. Observaciones Áulicas (case_observation_sheets) (8 fichas)
  console.log("-> Generando 8 fichas de observación áulica...");
  for (let i = 0; i < 8; i++) {
    const c = createdCases[i + 5];
    const sheetId = `obs-demo-${String(i + 1).padStart(3, "0")}`;
    db.prepare(`
      INSERT INTO case_observation_sheets (
        id, case_file_id, institution_id, professional_id, observation_date,
        jornada, context, subnivel, anxious_indicators, depressive_indicators,
        suicidal_indicators, risk_level, protective_factors, institutional_actions, observations, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sheetId,
      c.id,
      instId,
      c.spec.assigned_to,
      "2025-10-25 10:30:00",
      c.student.jornada,
      "AULA",
      c.student.age <= 8 ? "ELEMENTAL" : (c.student.age <= 11 ? "BASICA_MEDIA" : "SUPERIOR_BACHILLERATO"),
      JSON.stringify(["Inquietud motriz", "Mordisqueo de uñas o lápices", "Dificultad para mantener la mirada"]),
      JSON.stringify(["Aislamiento en trabajos grupales", "Expresión facial apática"]),
      JSON.stringify([]),
      c.spec.priority === "ALTA" ? "ALTO" : "MEDIO",
      JSON.stringify(["Vínculo positivo con docente tutor", "Gusto por el dibujo y actividades artísticas"]),
      JSON.stringify(["Ubicación en primera fila", "Refuerzo positivo verbal"]),
      `Observación realizada durante la clase de Lengua y Literatura. Se constata la interacción del estudiante con sus compañeros y respuesta a consignas docentes.`,
      "2025-10-25 11:30:00"
    );
  }

  // 11. Planes de Atención y Acompañamiento Psicosocial (case_care_plans) (12 planes)
  console.log("-> Generando 12 planes de atención psicosocial...");
  for (let i = 0; i < 12; i++) {
    const c = createdCases[i];
    const planId = `plan-care-demo-${String(i + 1).padStart(3, "0")}`;
    db.prepare(`
      INSERT INTO case_care_plans (
        id, case_file_id, institution_id, professional_id, plan_date, jornada,
        tutor_name, diagnosis_summary, intervention_types, actions, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      planId,
      c.id,
      instId,
      c.spec.assigned_to,
      c.spec.detection_date,
      c.student.jornada,
      "Lic. Carlos Manuel Quishpe Andrango",
      `Diagnóstico presuntivo de ${c.spec.risk_type.toLowerCase().replace(/_/g, " ")}. Se requiere acompañamiento focalizado para restaurar el equilibrio socioafectivo y escolar.`,
      JSON.stringify(["INDIVIDUAL", "FAMILIAR"]),
      JSON.stringify([
        { accion: "Sesiones de apoyo socioemocional", profesional: "DECE", tiempo: "1 vez por semana", observaciones: "Trabajo en autoconcepto y resiliencia" },
        { accion: "Entrevistas de seguimiento familiar", profesional: "Trabajo Social DECE", tiempo: "Quincenal", observaciones: "Verificación de acuerdos en el hogar" },
        { accion: "Estrategias de aula con el tutor", profesional: "Tutor de curso", tiempo: "Permanente", observaciones: "Monitoreo del clima escolar" }
      ]),
      c.spec.status === "CERRADO" ? "CUMPLIDO" : "EN_CURSO",
      c.spec.detection_date + " 16:00:00",
      "2026-02-10 10:00:00"
    );
  }

  // 12. Planes de Restitución de Derechos (case_restitution_plans) (6 planes)
  console.log("-> Generando 6 planes de restitución de derechos...");
  for (let i = 0; i < 6; i++) {
    const c = createdCases[i];
    const restId = `rest-plan-demo-${String(i + 1).padStart(3, "0")}`;
    db.prepare(`
      INSERT INTO case_restitution_plans (
        id, case_file_id, institution_id, school_year, elaboration_date,
        risk_factors, violence_types, violence_modality, victims, report_narrative,
        legal_instances, accompaniment_actions, prepared_by_name, approved_by_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      restId,
      c.id,
      instId,
      "2025-2026",
      c.spec.detection_date,
      "Factores de vulnerabilidad en el entorno intrafamiliar o escolar con afectación al derecho a una educación libre de violencia.",
      JSON.stringify(["PSICOLOGICA", "NEGLIGENCIA"]),
      JSON.stringify(["INTRAFAMILIAR"]),
      JSON.stringify([{ iniciales: c.student.full_name.split(" ").map(w=>w[0]).join(""), cedula: c.student.document_id, edad: c.student.age, genero: c.student.gender }]),
      `Plan formulado en el marco del protocolo ministerial de protección y restitución de derechos frente a situaciones de vulneración detectadas en el plantel.`,
      JSON.stringify([{ instancia: "DECE / Distrito Educativo 17D03", fecha_denuncia: c.spec.detection_date, numero_denuncia: `OF-DECE-17D03-2025-${i+10}`, medidas: "Medidas administrativas de protección integral", estado: "EN_TRAMITE" }]),
      JSON.stringify([{ categoria: "Acompañamiento Psicológico", ejecutor: "Psicólogo DECE", num_personas: 1, fecha_inicio: c.spec.detection_date, fecha_fin: "2026-06-15" }]),
      "Mgs. Elena Rocío Paredes Viteri",
      "Dr. Gonzalo Fernando Morales Espinosa",
      c.spec.detection_date + " 17:00:00",
      "2026-03-01 09:00:00"
    );
  }

  // 13. Actas de Socialización a Docentes (socialization_acts) (6 actas)
  console.log("-> Generando 6 actas de socialización docente con estrategias de aula...");
  for (let i = 0; i < 6; i++) {
    const c = createdCases[i];
    const actId = `act-soc-demo-${String(i + 1).padStart(3, "0")}`;
    db.prepare(`
      INSERT INTO socialization_acts (
        id, case_file_id, institution_id, act_date, act_place, vulnerability_type,
        agreements, teacher_signatures, prepared_by_name, approved_by_name, received_by_name, received_by_role, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actId,
      c.id,
      instId,
      "2025-10-10 11:00:00",
      "Sala de reuniones del DECE",
      c.spec.risk_type.replace(/_/g, " "),
      JSON.stringify([
        "Garantizar confidencialidad absoluta sobre la situación psicosocial del estudiante.",
        "Implementar estrategias de aula empáticas y evitar comentarios comparativos o estigmatizantes.",
        "Brindar flexibilidad temporal razonable en entrega de tareas y evaluaciones formativas.",
        "Reportar al DECE inmediatamente cualquier cambio conductual o alerta observada."
      ]),
      JSON.stringify([
        { asignatura: "Matemáticas", docente: "Ing. Marco Aurelio Morales" },
        { asignatura: "Lengua y Literatura", docente: "Lic. Carlos Manuel Quishpe" },
        { asignatura: "Ciencias Naturales", docente: "Dra. Silvana Vaca" }
      ]),
      "Mgs. Elena Rocío Paredes Viteri",
      "Dr. Gonzalo Fernando Morales Espinosa",
      "Lic. Carlos Manuel Quishpe Andrango",
      "Docente Tutor de Grado",
      "user-demo-coord",
      "2025-10-10 12:00:00",
      "2025-10-10 12:00:00"
    );
  }

  // 14. Actas de Asesoramiento a la Autoridad (authority_advisory_acts) (4 actas)
  console.log("-> Generando 4 actas de asesoramiento a la máxima autoridad...");
  for (let i = 0; i < 4; i++) {
    const c = createdCases[i];
    const advId = `adv-auth-demo-${String(i + 1).padStart(3, "0")}`;
    db.prepare(`
      INSERT INTO authority_advisory_acts (
        id, case_file_id, institution_id, act_date, act_time, act_place, issuing_entity,
        standard_code, participants, background, measures, advisory_scope, conclusion,
        dece_professional_name, authority_name, authority_role, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      advId,
      c.id,
      instId,
      "2025-10-12",
      "10:00",
      "Rectorado U.E. Los Álamos",
      "DECE Institucional",
      "E.D3.C1.DE13.c",
      JSON.stringify([
        { nombre: "Dr. Gonzalo Fernando Morales", cargo: "Rector", funcion: "Máxima Autoridad" },
        { nombre: "Mgs. Elena Rocío Paredes", cargo: "Coordinadora DECE", funcion: "Asesora Técnica" }
      ]),
      JSON.stringify([
        `2.1 Detección del caso de vulnerabilidad ${c.code} en el estudiante ${c.student.full_name}.`,
        `2.2 Informe de riesgo emitido por el equipo técnico DECE en apego a la LOEI.`
      ]),
      JSON.stringify([
        "PRIMERO: Disponer la reserva absoluta del expediente en todos los niveles institucionales.",
        "SEGUNDO: Notificar a inspección general y tutores sobre el plan de acompañamiento sin revictimización."
      ]),
      JSON.stringify([
        "4.1 Asesoramiento técnico legal y psicosocial según Modelo de Gestión DECE.",
        "4.2 Coordinación con Distrito 17D03 para seguimiento de rutas interinstitucionales."
      ]),
      "La Máxima Autoridad Institucional acoge favorablemente las medidas técnicas recomendadas por el DECE para garantizar el derecho a la educación integral y protección de la víctima.",
      "Mgs. Elena Rocío Paredes Viteri",
      "Dr. Gonzalo Fernando Morales Espinosa",
      "Rector Institucional",
      "user-demo-coord",
      "2025-10-12 11:30:00",
      "2025-10-12 11:30:00"
    );
  }

  // 15. Informes Técnicos Situacionales (situational_reports) (5 informes)
  console.log("-> Generando 5 informes técnicos situacionales...");
  for (let i = 0; i < 5; i++) {
    const c = createdCases[i];
    const sitId = `sit-rep-demo-${String(i + 1).padStart(3, "0")}`;
    db.prepare(`
      INSERT INTO situational_reports (
        id, case_file_id, institution_id, report_number, report_date,
        responsible_name, responsible_role, responsible_phone, responsible_email,
        addressed_to_name, addressed_to_role, situation_type, tema, tutor_name,
        scope_text, objective_text, eje_deteccion, eje_diagnostico_individual, eje_atencion_psicosocial,
        methodology, conclusions, recommendations, preparer_name, preparer_role, approver_name, approver_role,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sitId,
      c.id,
      instId,
      `INF-SIT-DECE-2025-${String(i + 1).padStart(3, "0")}`,
      "2025-11-05",
      "Mgs. Elena Rocío Paredes Viteri",
      "Coordinadora DECE",
      "0998412345",
      "coordinacion.losalamos@dece.edu.ec",
      "Dr. Gonzalo Fernando Morales Espinosa",
      "Rector Institucional",
      c.spec.risk_type.replace(/_/g, " "),
      `INFORME SITUACIONAL DEL CASO ${c.code} - ${c.student.full_name.toUpperCase()}`,
      "Lic. Carlos Manuel Quishpe Andrango",
      "Comunidad Educativa de la U.E. Los Álamos y Distrito Educativo 17D03.",
      "Informar de manera pormenorizada las acciones técnicas desplegadas por el DECE y el estado situacional del estudiante.",
      `Detección inicial efectuada por ${c.spec.detection_source} con reporte de signos de alarma.`,
      "Valoración clínica y psicosocial evidenciando necesidad de contención emocional continua.",
      "Ejecución de 6 sesiones individuales de consejería y articulación permanente con el tutor de aula.",
      JSON.stringify(["Entrevista semiestructurada", "Observación directa", "Revisión documental académica"]),
      "El estudiante responde positivamente a las estrategias implementadas, observándose disminución del estrés escolar.",
      "Continuar con el acompañamiento psicosocial, mantener comunicación mensual con la familia y reforzar factores protectores.",
      "Mgs. Elena Rocío Paredes Viteri",
      "Coordinadora DECE",
      "Dr. Gonzalo Fernando Morales Espinosa",
      "Rector Institucional",
      "user-demo-coord",
      "2025-11-05 14:00:00",
      "2025-11-05 14:00:00"
    );
  }

  // 16. Alertas Docentes (teacher_alerts) (14 alertas)
  console.log("-> Generando 14 fichas de alerta docente...");
  for (let i = 0; i < 14; i++) {
    const student = studentsList[i + 10];
    const alertId = `alert-demo-${String(i + 1).padStart(3, "0")}`;
    const isConverted = i < 8; // 8 convertidas en caso, 6 pendientes / en revisión
    const matchedCase = isConverted ? createdCases[i]?.id : null;

    db.prepare(`
      INSERT INTO teacher_alerts (
        id, institution_id, student_id, reported_by_id, description, status, case_file_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alertId,
      instId,
      student.id,
      "user-demo-docente",
      `Docente tutor reporta que el/la estudiante ${student.full_name} presenta conductas atípicas en clase, descenso notable en calificaciones y reiterado aislamiento. Solicita evaluación oportuna del DECE.`,
      isConverted ? "CONVERTIDA_EN_CASO" : (i % 2 === 0 ? "EN_REVISION" : "PENDIENTE"),
      matchedCase,
      "2025-09-20 09:00:00",
      "2025-09-21 10:00:00"
    );
  }

  // 17. Atenciones Diarias / Consejería (daily_attentions) (35 registros)
  console.log("-> Registrando 35 atenciones cotidianas de consejería...");
  const attentionTypes = ["ESTUDIANTE", "REPRESENTANTE", "DOCENTE_AUTORIDAD"];
  const attentionReasons = [
    "Orientación vocacional y profesional previa a selección de bachillerato.",
    "Consulta sobre bajo rendimiento escolar y técnicas de estudio recomendadas.",
    "Apoyo socioemocional ante problemas de relación con el grupo de pares.",
    "Orientación sobre manejo de berrinches y normas de disciplina positiva en casa.",
    "Recepción de justificativo médico y coordinación de entrega de actividades pendientes.",
    "Asesoramiento a docente sobre estrategias para estudiante inquieto en el aula.",
    "Dudas sobre proceso de becas socioeconómicas y bienestar estudiantil."
  ];

  for (let i = 0; i < 35; i++) {
    const attId = `att-daily-demo-${String(i + 1).padStart(3, "0")}`;
    const st = studentsList[i % studentsList.length];
    const aType = attentionTypes[i % attentionTypes.length];
    const profId = i % 2 === 0 ? "user-demo-analista1" : "user-demo-analista2";

    const day = String((i % 28) + 1).padStart(2, "0");
    const month = String((i % 9) + 9 > 12 ? (i % 9) + 9 - 12 : (i % 9) + 9).padStart(2, "0");
    const year = month >= "09" ? "2025" : "2026";
    const dateStr = `${year}-${month}-${day} 10:15:00`;

    db.prepare(`
      INSERT INTO daily_attentions (
        id, institution_id, professional_id, attendee_type, attention_date, duration,
        student_name, student_grade, jornada, representative_name, attendee_name,
        reason, action_axis, modality_signed, observations, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      attId,
      instId,
      profId,
      aType,
      dateStr,
      "35 min",
      st.full_name,
      `${st.course} "${st.parallel}"`,
      st.jornada,
      aType === "REPRESENTANTE" ? st.representative : null,
      aType === "DOCENTE_AUTORIDAD" ? "Lic. Carlos Manuel Quishpe" : null,
      attentionReasons[i % attentionReasons.length],
      JSON.stringify(["INTERVENCION_INDIVIDUAL", "ORIENTACION"]),
      "Atención brindada de manera oportuna con firma del usuario en el libro de registro físico.",
      dateStr
    );
  }

  // 18. Citas y Solicitudes (appointments) (15 citas)
  console.log("-> Agendando 15 citas de seguimiento...");
  for (let i = 0; i < 15; i++) {
    const apptId = `appt-demo-${String(i + 1).padStart(3, "0")}`;
    const st = studentsList[i];
    const c = createdCases[i];
    const statuses = ["ATENDIDA", "ATENDIDA", "PROGRAMADA", "NO_ASISTIO"];
    const status = statuses[i % statuses.length];

    db.prepare(`
      INSERT INTO appointments (
        id, institution_id, student_id, case_file_id, professional_id, title,
        date, start_time, end_time, attendee_type, location, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      apptId,
      instId,
      st.id,
      c ? c.id : null,
      "user-demo-analista1",
      `Seguimiento Psicosocial - ${st.full_name}`,
      "2026-04-2" + (i % 9),
      "09:30",
      "10:15",
      i % 2 === 0 ? "ESTUDIANTE" : "REPRESENTANTE",
      "Oficina DECE Bloque B",
      status,
      "Revisión de compromisos y verificación de adaptación al entorno escolar.",
      "2026-04-01 08:00:00",
      "2026-04-01 08:00:00"
    );
  }

  // 19. Consentimientos para Círculos Restaurativos (restorative_circle_consents) (3)
  console.log("-> Registrando 3 consentimientos informados de círculos restaurativos...");
  for (let i = 0; i < 3; i++) {
    const consentId = `circle-demo-${String(i + 1).padStart(3, "0")}`;
    const c = createdCases[i + 5]; // casos de acoso escolar
    db.prepare(`
      INSERT INTO restorative_circle_consents (
        id, institution_id, school_year_id, case_file_id, student_id,
        student_name, course_parallel, course_parallel_full, course_parallel_short,
        shift, representative_phone, consent_date,
        representative_name, representative_ci,
        dece_user_id, dece_name, dece_role,
        created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, '2025-11-15 09:00:00', '2025-11-15 09:00:00'
      )
    `).run(
      consentId,
      instId,
      schoolYearId,
      c.id,
      c.student.id,
      c.student.full_name,
      `${c.student.course} "${c.student.parallel}"`,
      `${c.student.course} "${c.student.parallel}" — ${c.student.jornada}`,
      `${c.student.course} "${c.student.parallel}"`,
      c.student.jornada,
      c.student.rep_phone,
      "2025-11-15",
      c.student.representative,
      c.student.document_id,
      "user-demo-analista1",
      "Psic. Cl. Mateo Sebastián Alarcón Morales",
      "Analista DECE (Psicología)",
      "user-demo-analista1"
    );
  }

  // 20. Juntas de Curso (course_board_reports) (4 reportes)
  console.log("-> Registrando 4 actas e informes de juntas de curso...");
  const juntas = [
    { trim: "1T", course: "8.° EGB", parallel: "A", repCode: "INF-JC-2025-1T-8A" },
    { trim: "1T", course: "10.° EGB", parallel: "A", repCode: "INF-JC-2025-1T-10A" },
    { trim: "2T", course: "1.° BGU", parallel: "A", repCode: "INF-JC-2026-2T-1BGUA" },
    { trim: "2T", course: "3.° BGU", parallel: "A", repCode: "INF-JC-2026-2T-3BGUA" }
  ];

  juntas.forEach((j, idx) => {
    const jId = `jc-rep-demo-${String(idx + 1).padStart(3, "0")}`;
    db.prepare(`
      INSERT INTO course_board_reports (
        id, institution_id, school_year_id, school_year_text, user_id, user_name,
        user_role_label, tutor_name, tutor_role_label, report_code, trimester,
        course, parallel, jornada, report_date, antecedentes, alcance, objetivo,
        cases_json, general_actions, conclusiones, recomendaciones, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jId,
      instId,
      schoolYearId,
      "2025-2026",
      "user-demo-analista1",
      "Psic. Cl. Mateo Sebastián Alarcón Morales",
      "ANALISTA DECE",
      "Lic. Carlos Manuel Quishpe Andrango",
      "DOCENTE TUTOR",
      j.repCode,
      j.trim,
      j.course,
      j.parallel,
      "MATUTINA",
      "2025-12-18",
      "En cumplimiento a los lineamientos pedagógicos ministeriales para el desarrollo de juntas de curso de fin de periodo.",
      "Equipo docente del curso, coordinación de subnivel y Departamento de Consejería Estudiantil.",
      "Analizar el rendimiento académico integral, identificar casos de riesgo y consensuar planes de mejora.",
      JSON.stringify([{ codigo: "DECE-2025-0001", estudiante: "Estudiante en seguimiento", motivo: "Apoyo pedagógico y socioemocional" }]),
      "Reuniones de coordinación quincenales y socialización de estrategias con docentes de asignaturas clave.",
      "Se aprecia un clima escolar favorable y compromiso del cuerpo docente para atender a los estudiantes en situación de vulnerabilidad.",
      "Mantener adaptaciones curriculares sugeridas por el DECE y reportar oportunamente cualquier inasistencia prolongada.",
      "2025-12-18 12:00:00"
    );
  });

  db.pragma("foreign_keys = ON");
  console.log("=== ENTORNO DE DEMOSTRACIÓN CARGADO CON ÉXITO ===");
  console.log(`- Institución: Unidad Educativa Intercultural "Los Álamos" (${instId})`);
  console.log(`- Estudiantes: ${studentsList.length}`);
  console.log(`- Casos: ${createdCases.length}`);
  console.log(`- Acciones de bitácora: ${actionCount}`);
  console.log(`- Entrevistas: 18`);
  console.log(`- Observaciones: 8`);
  console.log(`- Planes de Atención: 12`);
  console.log(`- Planes de Restitución: 6`);
  console.log(`- Actas de Socialización: 6`);
  console.log(`- Actas de Asesoramiento: 4`);
  console.log(`- Informes Situacionales: 5`);
  console.log(`- Alertas Docentes: 14`);
  console.log(`- Atenciones Diarias: 35`);
  console.log(`- Citas: 15`);
  console.log(`- Círculos Restaurativos: 3`);
  console.log(`- Juntas de Curso: 4`);
}

if (require.main === module) {
  runDemoSeed();
}

module.exports = { runDemoSeed };
