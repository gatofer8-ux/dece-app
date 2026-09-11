// Catálogo Oficial de Talleres y Guiones Metodológicos de SADEX
// Dirección de Consejería Estudiantil (DECE) - Períodos Lectivos 2023-2024, 2024-2025 y 2025-2026
// REGLA DE PROTECCIÓN DE AUTORÍA INSTITUCIONAL:
// Los guiones metodológicos son de visualización exclusiva en pantalla (sin descarga).
// Los materiales prácticos, tarjetas recortables y fichas son descargables en Word (.docx).

export interface WorkshopPhase {
  number?: number;
  durationMinutes: number;
  title: string;
  objective?: string;
  materials?: string[];
  facilitatorScript: string;
  activitySteps?: string[];
  groupDynamics?: string;
  reflectiveQuestions?: string[];
  reflectionQuestions?: string[];
  materialsNeeded?: string[];
}

export interface WorkshopDownloadableMaterial {
  id: string;
  title: string;
  description: string;
  isPrintableCutout?: boolean;
  icon?: string;
  type?: string;
  targetUser?: string;
  printInstructions?: string;
  fileName?: string;
}

export interface Workshop {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  categoryLabel: string;
  normativeBase: string;
  targetAudiences: string[];
  targetAudienceLabel: string;
  estimatedDuration: string;
  relatedActionPlanTopic?: string;
  generalObjective: string;
  specificObjectives: string[];
  materialsGeneral: string[];
  preliminaryNotes?: string;
  phases: WorkshopPhase[];
  downloadableMaterials: WorkshopDownloadableMaterial[];
}

export const WORKSHOPS_DATABASE: Workshop[] = [
  {
    "id": "prevencion-suicidio",
    "slug": "prevencion-suicidio",
    "title": "Taller de Prevención del Suicidio y Conductas Autolíticas: Señales de Alerta y Redes de Apoyo",
    "subtitle": "Herramientas de detección temprana, mitos vs. realidades y fortalecimiento de factores protectores en el aula.",
    "category": "PREVENCION_044A",
    "categoryLabel": "Prevención Acuerdo 044-A",
    "normativeBase": "Acuerdo Ministerial MINEDUC-044-A (Temática 4) & LOEI Art. 73",
    "targetAudiences": [
      "DOCENTES",
      "ESTUDIANTES_SECUNDARIA",
      "COMUNIDAD_EDUCATIVA"
    ],
    "targetAudienceLabel": "Docentes, Estudiantes de Básica Superior / Bachillerato y Familias",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "SUICIDIO",
    "generalObjective": "Aumentar la sensibilización de la comunidad educativa sobre la prevención de conductas autolíticas, brindando herramientas prácticas para identificar oportunamente señales de alerta, derribar mitos y activar rutas institucionales de contención y derivación.",
    "specificObjectives": [
      "Identificar señales de alerta conductuales, verbales y emocionales de riesgo autolítico en el ámbito escolar.",
      "Desmitificar creencias erróneas sobre el suicidio que obstaculizan la búsqueda de ayuda.",
      "Promover la empatía grupal, el compañerismo y la comunicación abierta a través de dinámicas vivenciales.",
      "Socializar el protocolo oficial de notificación inmediata y activación de servicios de emergencia (ECU-911)."
    ],
    "materialsGeneral": [
      "Tarjetas de casos de simulación impresas",
      "Hojas de papel y bolígrafos",
      "Pelota o elemento de paso para dinámica grupal",
      "Lápices de colores y notas adhesivas",
      "Pizarra o papelógrafo para plenaria"
    ],
    "preliminaryNotes": "El facilitador debe remarcar antes de iniciar que este es un espacio seguro, confidencial y respetuoso. Si algún estudiante o docente se siente conmovido o abrumado durante la sesión, se le recordará que puede solicitar un momento a solas con el profesional DECE para contención individual inmediata.",
    "phases": [
      {
        "number": 1,
        "title": "Bienvenida, Encuadre y Acuerdos de Confidencialidad",
        "durationMinutes": 15,
        "objective": "Establecer un clima de confianza, empatía y respeto entre los participantes.",
        "facilitatorScript": "¡Buenas tardes a todas y todos! Hoy nos reunimos para hablar de un tema de vital importancia para nuestra comunidad: el cuidado de nuestra vida, nuestra salud emocional y cómo podemos ser guardianes y apoyo para nosotros mismos y para quienes nos rodean.\\n\\nQuiero comenzar agradeciéndoles por su presencia. Este espacio está diseñado con base en el respeto mutuo y la confidencialidad. Lo que compartamos aquí se queda aquí. Hablar de nuestras emociones no nos hace débiles; al contrario, pedir ayuda y saber escuchar es el mayor acto de valentía y solidaridad que podemos demostrar en nuestra institución.",
        "groupDynamics": "Explicar las 3 reglas de oro del taller: 1) Escucha activa sin juicios; 2) Confidencialidad absoluta; 3) Derecho a hacer una pausa si las emociones se vuelven intensas.",
        "reflectionQuestions": [
          "¿Por qué a veces nos cuesta hablar sobre cómo nos sentimos cuando estamos tristes o desesperados?",
          "¿Qué significa para ustedes contar con una red de apoyo en el colegio?"
        ]
      },
      {
        "number": 2,
        "title": "Dinámica Rompehielos: 'La Cadena de Apoyo'",
        "durationMinutes": 15,
        "objective": "Visibilizar que nadie está solo y que las palabras positivas tienen un impacto protector.",
        "facilitatorScript": "Nos vamos a colocar en círculo. Cada uno tiene una pequeña tarjeta. Van a escribir en ella una frase o palabra de aliento que a ustedes les gustaría escuchar cuando están pasando por un día muy difícil (ej: 'No estás solo', 'Vales mucho', 'Esto también pasará').\\n\\nAhora vamos a lanzar este balón a un compañero al azar. Quien lo reciba leerá su frase con voz clara y compartirá por qué esa frase le reconforta, luego se la pasará a otro compañero hasta que todos hayamos tejido una red protectora de palabras.",
        "groupDynamics": "Dinámica de la Cadena de Apoyo en círculo con un balón o madeja de lana.",
        "materialsNeeded": [
          "Tarjetas de apoyo",
          "Balón o madeja de lana"
        ]
      },
      {
        "number": 3,
        "title": "Actividad Central: Juego de Roles y Análisis de Casos 'Identificando Señales de Alerta'",
        "durationMinutes": 30,
        "objective": "Entrenar la capacidad de observación para reconocer niveles de riesgo y saber cómo intervenir sin juzgar.",
        "facilitatorScript": "Vamos a dividirnos en 4 grupos de trabajo. A cada grupo le entregaré una tarjeta con un caso real anonimizado (Caso 1: Estrés académico, Caso 2: Depresión y aislamiento, Caso 3: Conductas de riesgo y autolesiones, Caso 4: Crisis de riesgo inminente).\\n\\nEn sus grupos van a leer el caso y responderán tres preguntas clave:\\n1. ¿Cuáles son las señales de alerta que muestra el estudiante?\\n2. ¿Qué actitudes o respuestas por parte de compañeros o profesores empeorarían su situación?\\n3. ¿Cuál es el paso correcto que debemos dar de inmediato?",
        "groupDynamics": "Trabajo en subgrupos utilizando el material recortable de casos. El facilitador monitorea las mesas y orienta las respuestas.",
        "materialsNeeded": [
          "Juego de Tarjetas de Casos de Simulación (Material descargable oficial)"
        ]
      },
      {
        "number": 4,
        "title": "Actividad Creativa: 'Cartas de Esperanza y Botiquín Emocional'",
        "durationMinutes": 20,
        "objective": "Generar recursos de afrontamiento personal y mensajes que puedan acompañar momentos difíciles.",
        "facilitatorScript": "En este momento cada participante va a redactar una 'Carta de Esperanza' dirigida a su 'yo del futuro' o a un ser querido. ¿Qué le dirías a esa persona para recordarle que su presencia en este mundo es irremplazable? Además, escribiremos en nuestro botiquín emocional 3 acciones a las que podemos recurrir cuando sintamos que las emociones nos desbordan (ej. llamar a mi amigo de confianza, escuchar mi canción favorita, caminar, acudir al DECE).",
        "groupDynamics": "Escritura reflexiva individual con música instrumental suave de fondo.",
        "materialsNeeded": [
          "Hojas de Cartas de Esperanza",
          "Bolígrafos y colores"
        ]
      },
      {
        "number": 5,
        "title": "Cierre, Ruta Institucional y Líneas de Ayuda",
        "durationMinutes": 10,
        "objective": "Fijar con claridad el protocolo del Mineduc y los contactos de emergencia disponibles 24/7.",
        "facilitatorScript": "Para cerrar, recordemos la ruta oficial de nuestra institución:\\n- Si detectas que un compañero está en riesgo, avisa de inmediato a tu docente tutor o al personal del DECE. No te quedes con ese secreto: buscar ayuda salva vidas.\\n- Ante cualquier emergencia fuera del horario escolar, recuerda que la línea nacional 171 (opción 6 de salud mental) y el ECU-911 están disponibles las 24 horas del día de manera gratuita y confidencial.\\n\\nGracias a cada uno de ustedes por su apertura, respeto y compromiso con la vida.",
        "reflectionQuestions": [
          "¿Qué aprendizaje nuevo te llevas de este espacio?",
          "¿A quién te comprometes a cuidar y escuchar a partir de hoy?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "casos-simulacion-suicidio",
        "title": "Tarjetas de Casos de Simulación por Niveles de Riesgo",
        "description": "Contiene los 6 casos de simulación con recuadros punteados listos para imprimir y recortar. Incluye rúbrica para identificar Nivel Bajo (Verde), Moderado (Amarillo), Alto (Naranja) y Crítico (Rojo), junto con las preguntas de debate.",
        "type": "RECORTABLE",
        "targetUser": "Docentes y Estudiantes de Básica Superior / Bachillerato",
        "printInstructions": "Imprimir en hojas de papel bond o cartulina blanca A4. Recortar por las líneas punteadas para entregar un caso por subgrupo de trabajo.",
        "fileName": "Casos_Simulacion_Prevencion_Suicidio_SADEX.docx"
      },
      {
        "id": "guia-senales-alerta-mitos",
        "title": "Guía Didáctica: Señales Tempranas y Mitos vs. Realidades",
        "description": "Ficha sintética y visual con la lista de señales verbales, conductuales y emocionales de riesgo, el comparativo de mitos comunes y los números de contacto de auxilio (ECU-911 y Línea 171).",
        "type": "FICHA_TRABAJO",
        "targetUser": "Docentes Tutores y Estudiantes",
        "printInstructions": "Imprimir a doble cara si es posible. Ideal para pegar en la cartelera del aula o guardar en la carpeta pedagógica del docente.",
        "fileName": "Ficha_Senales_Alerta_y_Mitos_SADEX.docx"
      }
    ]
  },
  {
    "id": "primeros-auxilios-psicologicos",
    "slug": "primeros-auxilios-psicologicos",
    "title": "Taller Práctico de Primeros Auxilios Psicológicos (PAP) en el Entorno Educativo",
    "subtitle": "Protocolos de contención inmediata, regulación emocional y acompañamiento en situaciones de crisis escolar.",
    "category": "PRIMEROS_AUXILIOS_PAP",
    "categoryLabel": "Soporte y Crisis Emocional (PAP)",
    "normativeBase": "Modelo de Gestión DECE & Guías de Intervención en Crisis MINEDUC",
    "targetAudiences": [
      "DOCENTES",
      "PROFESIONALES_DECE",
      "COMUNIDAD_EDUCATIVA"
    ],
    "targetAudienceLabel": "Personal Docente, Administrativo y Profesionales DECE",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "SALUD_MENTAL",
    "generalObjective": "Capacitar al personal docente y administrativo en la aplicación de los 5 principios fundamentales de los Primeros Auxilios Psicológicos (PAP) para responder con empatía, calma y seguridad ante descompensaciones emocionales o eventos críticos en el aula.",
    "specificObjectives": [
      "Diferenciar con claridad el alcance de los PAP (apoyo inmediato y no invasivo) respecto a una terapia psicológica clínica.",
      "Dominar las 3 fases de actuación en crisis: Acercamiento seguro, Contención/Alivio y Enlace con redes.",
      "Entrenar técnicas prácticas de autorregulación emocional: respiración diafragmática y ejercicios de enraizamiento (Grounding).",
      "Prevenir la revictimización y el desborde emocional mediante pautas claras de 'Qué hacer y qué evitar'."
    ],
    "materialsGeneral": [
      "Guías de bolsillo de PAP impresas",
      "Tarjetas de ejercicios de regulación emocional",
      "Proyector o pantalla para video tutorial de apoyo",
      "Hojas de registro de descompensación emocional para docentes"
    ],
    "preliminaryNotes": "Se debe hacer énfasis en que los docentes NO necesitan ser psicólogos para aplicar PAP. Los PAP son una herramienta humana de contención inicial basada en la calma, la escucha activa y la seguridad física y emocional.",
    "phases": [
      {
        "number": 1,
        "title": "Encuadre Conceptual: ¿Qué son y qué NO son los PAP?",
        "durationMinutes": 15,
        "objective": "Desmitificar la intervención en crisis y delimitar el rol protector del docente.",
        "facilitatorScript": "Estimados compañeros educadores: En nuestro día a día en el aula nos encontramos frecuentemente con estudiantes que experimentan ataques de pánico, llanto incontrolable por crisis familiares o bloqueos ante situaciones de estrés extremo.\\n\\nLos Primeros Auxilios Psicológicos son como los primeros auxilios médicos: no reemplazan a la cirugía ni al médico especialista, pero detienen la hemorragia y salvan vidas en los primeros minutos. Los PAP buscan brindar alivio inmediato, devolver la sensación de seguridad y evitar que el evento traumático se agrave. No juzgamos, no diagnosticamos, no forzamos a hablar: acompañamos con calidez y presencia tranquilizadora.",
        "groupDynamics": "Lluvia de ideas inicial en pizarra: '¿Qué sientes cuando un estudiante entra en crisis frente a ti?'",
        "reflectionQuestions": [
          "¿Por qué frases como 'no llores', 'cálmate que no es para tanto' o 'tienes que ser fuerte' suelen empeorar la crisis?",
          "¿Cuál es el valor del silencio empático en un momento de desborde?"
        ]
      },
      {
        "number": 2,
        "title": "Los 5 Principios Clave: Escuchar, Proteger, Consolar, Informar y Conectar",
        "durationMinutes": 25,
        "objective": "Aprender y memorizar el pentágono de contención de la OMS / Mineduc.",
        "facilitatorScript": "Vamos a desglosar los cinco pilares de los PAP:\\n1. ESCUCHAR: Colócate a su misma altura física, haz contacto visual suave y valida su emoción con frases como: 'Estoy aquí contigo, estás a salvo'.\\n2. PROTEGER: Aparta al estudiante de miradas curiosas o del bullicio del patio. Llévalo a un lugar ventilado y tranquilo.\\n3. CONSOLAR: Ayúdale a regular su respiración. Invítale a beber un sorbo de agua a temperatura ambiente.\\n4. INFORMAR: Si hubo un rumor o accidente, explícale con palabras sencillas y certeras lo que está pasando, reduciendo la incertidumbre.\\n5. CONECTAR: No lo dejes solo. Comunícate de inmediato con el DECE y con su representante legal para generar la red protectora.",
        "groupDynamics": "Exposición dialogada apoyada en el video guía y entrega de la Guía de Bolsillo para docentes.",
        "materialsNeeded": [
          "Guía de Bolsillo PAP (Material descargable oficial)"
        ]
      },
      {
        "number": 3,
        "title": "Simulación Práctica en Parejas: Casos de Descompensación en Aula",
        "durationMinutes": 30,
        "objective": "Entrenar la postura corporal, el tono de voz y las respuestas de contención ante una crisis simulada.",
        "facilitatorScript": "Nos vamos a colocar en parejas (Docente A y Docente B). Docente A asumirá el rol de un estudiante de 14 años que acaba de recibir una noticia desgarradora y está hiperventilando en el pasillo. Docente B aplicará el protocolo de los 3 pasos: aproximarse sin invadir, pedir permiso para sentarse cerca, modular el tono de voz hacia uno grave y pausado, y guiar una respiración conjunta. Luego invertiremos los roles.",
        "groupDynamics": "Juego de roles cruzado en parejas con retroalimentación del facilitador DECE.",
        "reflectionQuestions": [
          "¿Cómo se sintió estar en el rol de la persona en crisis? ¿Qué actitudes del compañero te dieron calma real?",
          "¿Qué tan difícil fue controlar el impulso de dar consejos apresurados?"
        ]
      },
      {
        "number": 4,
        "title": "Técnicas de Enraizamiento: El Método Grounding 5-4-3-2-1",
        "durationMinutes": 10,
        "objective": "Aprender la herramienta más eficaz para reconectar la mente con los sentidos durante un ataque de pánico.",
        "facilitatorScript": "Cuando una persona está en pánico, su cerebro está atrapado en un bucle de alerta. La técnica 5-4-3-2-1 la trae de vuelta al presente mediante los cinco sentidos:\\n- Nombra 5 cosas que puedas VER a tu alrededor.\\n- Nombra 4 cosas que puedas TOCAR (la textura de tu ropa, la mesa, tus manos).\\n- Nombra 3 cosas que puedas ESCUCHAR (el viento, mi voz, los pasos lejanos).\\n- Nombra 2 cosas que puedas OLER.\\n- Nombra 1 cosa que puedas SABOREAR o algo bueno de ti mismo.\\nVamos a practicarla todos juntos en este instante.",
        "groupDynamics": "Ejercicio guiado grupal con las Tarjetas de Regulación Emocional.",
        "materialsNeeded": [
          "Tarjetas Recortables de Grounding 5-4-3-2-1"
        ]
      },
      {
        "number": 5,
        "title": "Cierre y Derivación Segura al DECE",
        "durationMinutes": 10,
        "objective": "Establecer con precisión el traspaso de información confidencial hacia el equipo del DECE.",
        "facilitatorScript": "Una vez que el estudiante ha recuperado el ritmo respiratorio básico, el docente llena la Ficha Rápida de Notificación y lo acompaña con calidez a la oficina del DECE. Nunca enviamos al estudiante solo ni lo dejamos esperando en un pasillo. Colegas: su intervención oportuna marca la diferencia entre un trauma prolongado y una recuperación resiliente. ¡Muchas gracias por su entrega y vocación!",
        "groupDynamics": "Entrega de ficha de compromisos y retroalimentación final."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "guia-bolsillo-pap-docentes",
        "title": "Guía de Bolsillo de Primeros Auxilios Psicológicos (Docentes)",
        "description": "Formato tríptico/plegable de bolsillo con los 5 principios (Escuchar, Proteger, Consolar, Informar, Conectar), la tabla 'Qué hacer vs. Qué NO hacer' y el flujograma de notificación al DECE.",
        "type": "GUIA_BOLSILLO",
        "targetUser": "Docentes y Personal Administrativo",
        "printInstructions": "Imprimir en papel bond a doble cara. Plegar en tres partes para llevar en el cuaderno de asistencia o bolsillo.",
        "fileName": "Guia_Bolsillo_PAP_Docentes_SADEX.docx"
      },
      {
        "id": "tarjetas-grounding-respiracion",
        "title": "Tarjetas Recortables de Regulación Emocional (Grounding y Respiración)",
        "description": "Contiene 4 tarjetas recortables con la técnica de respiración diafragmática 4-4-4-4 y la dinámica sensorial 5-4-3-2-1 para calmar crisis de pánico o ansiedad en el aula.",
        "type": "RECORTABLE",
        "targetUser": "Estudiantes y Docentes Tutores",
        "printInstructions": "Imprimir en cartulina A4 a color o blanco y negro. Recortar por los bordes punteados para repartir en aula o tener en el rincón de calma.",
        "fileName": "Tarjetas_Recortables_Grounding_Respiracion_SADEX.docx"
      }
    ]
  },
  {
    "id": "autoestima-ninos-10-anos",
    "slug": "autoestima-ninos-10-anos",
    "title": "Taller Lúdico de Autoestima: 'El Jardín de Mis Fortalezas y Superpoderes'",
    "subtitle": "Desarrollo de una autoimagen positiva, reconocimiento de cualidades personales y compañerismo en niñas y niños.",
    "category": "DESARROLLO_SOCIOEMOCIONAL",
    "categoryLabel": "Desarrollo Socioemocional Infantil",
    "normativeBase": "Acuerdo MINEDUC-044-A (Educación Socioemocional) & LOEI Art. 73",
    "targetAudiences": [
      "ESTUDIANTES_PRIMARIA",
      "DOCENTES"
    ],
    "targetAudienceLabel": "Estudiantes de 8 a 11 años (Básica Elemental y Media)",
    "estimatedDuration": "60 minutos",
    "relatedActionPlanTopic": "SOCIOEMOCIONAL",
    "generalObjective": "Favorecer la construcción de una sana autoestima en niñas y niños mediante dinámicas lúdicas, cuentos interactivos y actividades manuales que les permitan identificar y celebrar sus propias fortalezas y las de sus pares.",
    "specificObjectives": [
      "Comprender qué es la autoestima y cómo influyen las palabras positivas en nuestro bienestar.",
      "Identificar cualidades, talentos y valores individuales mediante una flor recortable de fortalezas.",
      "Fortalecer el respeto y la convivencia armónica entre compañeros de grado.",
      "Generar compromisos personales de buen trato y autocuidado diario."
    ],
    "materialsGeneral": [
      "Globos de colores y marcadores",
      "Fichas recortables 'Mi Flor de Fortalezas' impresas",
      "Tijeras infantiles y barras de pegamento",
      "Lápices de colores y crayones"
    ],
    "preliminaryNotes": "Se recomienda que el facilitador use un tono entusiasta, lúdico y cercano. En caso de que algún niño manifieste dificultad para encontrar cosas positivas sobre sí mismo, el facilitador o sus compañeros pueden regalarle palabras de aprecio genuino.",
    "phases": [
      {
        "number": 1,
        "title": "Bienvenida y Dinámica: 'El Globo de la Autoestima'",
        "durationMinutes": 15,
        "objective": "Visualizar de forma concreta cómo las palabras inflan o desinflan nuestro ánimo.",
        "facilitatorScript": "¡Hola a todas y todos, campeones! ¿Quién de ustedes sabe qué es la autoestima?\\n(Los niños responden libremente).\\n¡Excelente! La autoestima es el amor y respeto que sentimos por nosotros mismos: es saber que somos personas únicas, valiosas e irrepetibles.\\n\\nHoy tengo un globo en mis manos. Cuando en casa o en la escuela nos dicen cosas bonitas o reconocemos nuestros logros, nuestro globo se infla grande y brillante. Pero cuando alguien nos ofende o nosotros mismos nos tratamos mal, el globo se desinfla un poquito. Vamos a inflar nuestro propio globo y escribiremos en él una palabra que nos haga sentir súper felices con nosotros mismos.",
        "groupDynamics": "Cada niño recibe un globo y marcador para escribir su cualidad principal. Se comparte en voz alta.",
        "materialsNeeded": [
          "Globos de colores",
          "Marcadores"
        ]
      },
      {
        "number": 2,
        "title": "Cuento Interactivo: 'El Jardín de los Árboles Diferentes'",
        "durationMinutes": 15,
        "objective": "Enseñar que la diversidad de talentos es lo que hace hermoso a un grupo.",
        "facilitatorScript": "Había una vez un jardín encantado donde todos los árboles querían ser iguales: el roble quería dar manzanas como el manzano, y el manzano quería dar rosas rojas como el rosal. Todos estaban tristes porque no apreciaban lo que tenían dentro. Hasta que llegó un búho sabio y les dijo: 'Tú no puedes dar manzanas porque eres un roble fuerte que da sombra maravillosa a los pájaros; y tú, manzano, alimentas con fruta deliciosa. Cada uno tiene su propia magia y propósito'. Desde ese día, el jardín floreció lleno de alegría.",
        "groupDynamics": "Narración animada del cuento con preguntas participativas.",
        "reflectionQuestions": [
          "¿Por qué es aburrido que todos seamos iguales?",
          "¿Cuál es el superpoder o talento especial que te hace único en tu grado?"
        ]
      },
      {
        "number": 3,
        "title": "Actividad Manual y Recortable: 'Mi Flor de Fortalezas'",
        "durationMinutes": 20,
        "objective": "Elaborar una manualidad personalizada que el niño conserve como recordatorio de su valía.",
        "facilitatorScript": "¡Ahora manos a la obra! A cada uno le voy a entregar su ficha de 'Mi Flor de Fortalezas'. En el centro de la flor van a dibujar su carita sonriente. En cada uno de los pétalos recortables van a escribir o dibujar cosas maravillosas de ustedes:\\n- Pétalo 1: Algo en lo que soy genial.\\n- Pétalo 2: Un buen acto que hice por alguien.\\n- Pétalo 3: Algo que me hace sonreír.\\n- Pétalo 4: Un sueño que quiero cumplir.\\nLuego recortamos los pétalos y armamos nuestra flor decorada con colores hermosos.",
        "groupDynamics": "Trabajo manual en pupitres con tijeras escolares y pegamento. El facilitador y el docente recorren el aula reforzando a los niños.",
        "materialsNeeded": [
          "Ficha Recortable 'Mi Flor de Fortalezas' (Material descargable)",
          "Tijeras",
          "Pegamento",
          "Colores"
        ]
      },
      {
        "number": 4,
        "title": "Galería de Flores y Compromiso de Cierre",
        "durationMinutes": 10,
        "objective": "Celebrar los trabajos de todos y fijar el compromiso del buen trato.",
        "facilitatorScript": "Vamos a levantar todos nuestra flor de fortalezas bien alto. Miren qué hermoso jardín hemos formado hoy. Ninguna flor es mejor que otra: todas son especiales. Vamos a repetir juntos nuestro juramento del superhéroe del buen trato:\\n'Yo soy importante, yo soy valioso, y me comprometo a tratarme con amor a mí mismo y a cuidar el corazón de mis compañeros'.\\n¡Un fuertísimo aplauso para todas y todos!",
        "groupDynamics": "Exposición colectiva de las flores en un mural del aula y entrega de las tarjetas coleccionables de afirmaciones.",
        "materialsNeeded": [
          "Tarjetas Coleccionables de Afirmaciones Positivas"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "ficha-flor-fortalezas",
        "title": "Ficha Didáctica Recortable: 'Mi Flor de Fortalezas'",
        "description": "Lámina imprimible en blanco y negro con la silueta de un tallo, hojas y 6 pétalos de líneas punteadas para recortar y colorear. Cada pétalo contiene un disparador positivo para que el estudiante complete.",
        "type": "RECORTABLE",
        "targetUser": "Niñas y niños de 8 a 11 años",
        "printInstructions": "Imprimir en hoja A4 (papel bond o cartulina). Repartir una hoja por estudiante junto con tijeras punta roma y pegamento.",
        "fileName": "Ficha_Recortable_Flor_Fortalezas_Autoestima_SADEX.docx"
      },
      {
        "id": "tarjetas-afirmaciones-positivas",
        "title": "Tarjetas Coleccionables de Afirmaciones (Superpoderes Emocionales)",
        "description": "Set de 8 tarjetas coleccionables recortables con frases de empoderamiento (ej: 'Soy valiente ante los retos', 'Mi voz merece ser escuchada', 'Mis errores me ayudan a aprender').",
        "type": "RECORTABLE",
        "targetUser": "Estudiantes de Primaria",
        "printInstructions": "Imprimir a color o en blanco y negro para pintar. Recortar por los bordes para entregar como incentivo al final del taller.",
        "fileName": "Tarjetas_Coleccionables_Afirmaciones_Positivas_SADEX.docx"
      }
    ]
  },
  {
    "id": "formacion-profesionales-dece",
    "slug": "formacion-profesionales-dece",
    "title": "Taller para Equipos DECE: Enfoque de Derechos, Pobreza Infantil y Determinantes Sociales",
    "subtitle": "Herramientas de análisis contextual, interseccionalidad y dinámicas no verbales para la intervención psicosocial.",
    "category": "FORMACION_DECE",
    "categoryLabel": "Formación Técnica para Profesionales DECE",
    "normativeBase": "Estatuto Orgánico de Gestión Organizacional DECE & LOEI",
    "targetAudiences": [
      "PROFESIONALES_DECE",
      "DOCENTES"
    ],
    "targetAudienceLabel": "Profesionales DECE, Directivos y Docentes Mentores",
    "estimatedDuration": "120 minutos",
    "relatedActionPlanTopic": "CAPACITACION_DOCENTE",
    "generalObjective": "Fortalecer las capacidades técnicas de los profesionales DECE en el análisis crítico de la pobreza infantil y las brechas estructurales de género y territorio, incorporando metodologías activas y no verbales para el diagnóstico e intervención en la comunidad escolar.",
    "specificObjectives": [
      "Analizar los datos actualizados y el impacto multidimensional de la pobreza infantil en el desarrollo integral y permanencia escolar.",
      "Ejecutar la dinámica vivencial 'El Contexto es mucho texto' para visibilizar barreras socioeconómicas sin utilizar la palabra hablada.",
      "Identificar roles de género impuestos (cuidado doméstico en niñas y adolescentes) que generan ausentismo o deserción.",
      "Diseñar estrategias institucionales afirmativas de acompañamiento psicosocial contextualizado a la realidad territorial."
    ],
    "materialsGeneral": [
      "Presentación institucional en diapositivas",
      "Matriz de análisis contextual y fichas de debate",
      "Tarjetas con roles y situaciones socioeconómicas invisibles",
      "Papelógrafos y marcadores para conclusiones técnicas"
    ],
    "preliminaryNotes": "Taller de nivel técnico superior diseñado para jornadas pedagógicas de autoevaluación institucional, reuniones de red DECE de circuito o talleres distritales.",
    "phases": [
      {
        "number": 1,
        "title": "Apertura y Diagnóstico: Pobreza Infantil Multidimensional en Ecuador",
        "durationMinutes": 30,
        "objective": "Contextualizar los factores de vulnerabilidad que impactan el aprendizaje y la salud mental.",
        "facilitatorScript": "Colegas del Departamento de Consejería Estudiantil: Cuando un estudiante llega tarde, no presenta una tarea o muestra retraimiento, muchas veces la institución tiende a etiquetarlo bajo una mirada punitiva o meramente conductual.\\n\\nSin embargo, la realidad de nuestros territorios nos muestra que los niños y adolescentes en situación de pobreza enfrentan privaciones severas no solo materiales, sino de tiempo, nutrición y soporte afectivo. Las niñas, por ejemplo, asumen tempranamente el rol machista de cuidadoras de hermanos menores mientras las madres salen a trabajar en la informalidad, lo cual compromete directamente su permanencia escolar. Como DECE, nuestra mirada técnica debe trascender el síntoma y comprender la raíz estructural del contexto.",
        "groupDynamics": "Presentación de datos y debate introductorio sobre las realidades de la institución.",
        "reflectionQuestions": [
          "¿Cómo influyen las condiciones socioeconómicas del barrio o cantón en las alertas que recibimos a diario?",
          "¿De qué manera evitamos revictimizar a los hogares en situación de vulnerabilidad extrema?"
        ]
      },
      {
        "number": 2,
        "title": "Dinámica Central: 'El Contexto es mucho texto' (Ejercicio No Verbal)",
        "durationMinutes": 40,
        "objective": "Vivenciar las brechas de acceso y las diferencias sociales sin recurrir al lenguaje oral.",
        "facilitatorScript": "Vamos a realizar el ejercicio 'El Contexto es mucho texto'. A cada grupo se le asignará una situación de vida real: 1) Estudiante con doble jornada laboral y escolar; 2) Adolescente a cargo del cuidado de adultos mayores; 3) Estudiante sin conectividad ni luz eléctrica; 4) Estudiante de familia con estabilidad económica.\\n\\nCada grupo deberá representar su realidad ante la plenaria SIN PRONUNCIAR UNA SOLA PALABRA, utilizando únicamente expresión corporal, silencios y objetos del entorno. Los demás grupos deberán decodificar las barreras invisibles que experimenta esa persona.",
        "groupDynamics": "Dramatización no verbal en subgrupos con análisis posterior.",
        "materialsNeeded": [
          "Fichas de Situaciones Contextuales (Material descargable oficial)"
        ]
      },
      {
        "number": 3,
        "title": "Mesa Técnica: Construcción de la Matriz de Vulnerabilidad Territorial",
        "durationMinutes": 35,
        "objective": "Articular planes de acompañamiento con enfoque de equidad e inclusión.",
        "facilitatorScript": "Utilizando la Matriz de Diagnóstico Contextual que tienen en sus manos, vamos a mapear en equipos cuáles son los 3 factores de riesgo territorial más agudos de nuestra comunidad escolar (ej. consumo de sustancias en los alrededores, trabajo infantil informal, desestructuración familiar por migración). Para cada factor, plantearemos una acción de protección DECE que involucre a los docentes y a las redes interinstitucionales.",
        "groupDynamics": "Trabajo en mesas técnicas interdisciplinarias.",
        "materialsNeeded": [
          "Matriz de Diagnóstico Contextual DECE"
        ]
      },
      {
        "number": 4,
        "title": "Plenaria, Acuerdos y Vinculación con el Plan de Acción (POA)",
        "durationMinutes": 15,
        "objective": "Consolidar las conclusiones e incorporarlas a los compromisos de gestión institucional.",
        "facilitatorScript": "Las reflexiones vertidas hoy demuestran la solidez de nuestro rol técnico. No somos observadores pasivos: el DECE es el puente que garantiza que el derecho a la educación se cumpla en condiciones de dignidad. Los compromisos generados hoy se incorporarán de forma tangible en nuestro Plan de Acción Anual institucional.",
        "groupDynamics": "Lectura de actas y compromisos finales."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "matriz-analisis-contexto-dece",
        "title": "Matriz de Diagnóstico Contextual y Preguntas de Debate DECE",
        "description": "Documento de trabajo para profesionales DECE que incluye la rúbrica de análisis de brechas de género, roles de cuidado, determinantes socioeconómicos y las 4 fichas de situaciones para la dinámica 'El Contexto es mucho texto'.",
        "type": "MATRIZ_ANALISIS",
        "targetUser": "Profesionales DECE y Directivos",
        "printInstructions": "Imprimir en hojas A4 para repartir una matriz por mesa de trabajo técnico.",
        "fileName": "Matriz_Analisis_Contextual_Pobreza_Infantil_DECE_SADEX.docx"
      }
    ]
  },
  {
    "id": "estilos-crianza-corresponsabilidad",
    "slug": "estilos-crianza-corresponsabilidad",
    "title": "Taller para Familias y Docentes: 'Jugando a Criar y Colaborar'",
    "subtitle": "Reflexión sobre los 4 estilos de crianza, límites con afecto y corresponsabilidad entre el hogar y la escuela.",
    "category": "PREVENCION_044A",
    "categoryLabel": "Escuela para Familias (044-A)",
    "normativeBase": "Acuerdo Ministerial MINEDUC-044-A (Temática 5) & LOEI Art. 73",
    "targetAudiences": [
      "FAMILIAS",
      "DOCENTES",
      "COMUNIDAD_EDUCATIVA"
    ],
    "targetAudienceLabel": "Padres, Madres, Representantes Legales y Personal Docente",
    "estimatedDuration": "60 minutos",
    "relatedActionPlanTopic": "VINCULO_FAMILIAS",
    "generalObjective": "Propiciar un espacio lúdico y reflexivo para que las familias y docentes identifiquen los estilos de crianza predominantes y fortalezcan la corresponsabilidad en el acompañamiento académico y socioemocional de niñas, niños y adolescentes.",
    "specificObjectives": [
      "Diferenciar las características y consecuencias formativas de los 4 estilos de crianza: Autoritario, Permisivo, Democrático/Asertivo y Negligente.",
      "Comprender la corresponsabilidad familia-escuela como una alianza protectora indispensable.",
      "Brindar pautas prácticas para establecer normas claras con afecto y comunicación asertiva en el hogar.",
      "Construir acuerdos y compromisos mutuos plasmados en el Árbol de la Corresponsabilidad."
    ],
    "materialsGeneral": [
      "Cartones impresos del Bingo de Estilos de Crianza",
      "Fichas para marcar o semillas/botones",
      "Palitos de helado o bloques de construcción para la torre",
      "Papelógrafos, marcadores y notas adhesivas de colores"
    ],
    "preliminaryNotes": "Crear un clima de empatía y cero juzgamiento. Ninguna familia es perfecta; el objetivo es brindar herramientas prácticas de crianza positiva y no culpabilizar a los padres.",
    "phases": [
      {
        "number": 1,
        "title": "Bienvenida y Dinámica: 'El Círculo de las Emociones Familiares'",
        "durationMinutes": 10,
        "objective": "Romper el hielo y validar las emociones vinculadas al rol de educar y criar.",
        "facilitatorScript": "¡Buenas tardes a todas las mamás, papás y docentes presentes! Sean muy bienvenidos a este taller 'Jugando a Criar y Colaborar'.\\n\\nEducar y criar a un hijo o hija en los tiempos actuales es una de las tareas más hermosas, pero también una de las más desafiantes. A veces sentimos orgullo, otras cansancio, dudas o preocupación. En este círculo, todas las emociones son válidas. Vamos a compartir una sola palabra que describa cómo nos sentimos hoy frente al reto de acompañar el crecimiento de nuestros hijos.",
        "groupDynamics": "Ronda rápida en círculo compartiendo una emoción y encuadre de respeto.",
        "reflectionQuestions": [
          "¿Por qué es importante reconocer que la crianza no viene con un manual perfecto?",
          "¿Cómo influye nuestro estado de ánimo en la forma en que respondemos a nuestros hijos?"
        ]
      },
      {
        "number": 2,
        "title": "Dinámica Central: 'El Bingo de los Estilos de Crianza'",
        "durationMinutes": 20,
        "objective": "Identificar vivencialmente los estilos autoritario, permisivo, democrático y negligente.",
        "facilitatorScript": "A cada participante le hemos entregado un cartón del 'Bingo de Estilos de Crianza'. Yo leeré situaciones de la vida cotidiana (ej: 'El hijo pide permiso para llegar tarde y el padre responde: ¡Aquí se hace lo que yo digo y punto!'; o 'La madre deja que la niña juegue en el celular hasta la madrugada porque no quiere escuchar berrinches').\\n\\nUstedes buscarán en su cartón a qué estilo corresponde esa conducta y colocarán una ficha. Quien complete una línea gritará ¡BINGO! y analizaremos juntos qué mensaje transmite ese estilo al corazón del niño.",
        "groupDynamics": "Juego grupal de Bingo con tarjetas recortables de situaciones familiares.",
        "materialsNeeded": [
          "Cartones de Bingo de Estilos de Crianza (Material recortable descargable)"
        ]
      },
      {
        "number": 3,
        "title": "Actividad en Equipos: 'La Torre de la Corresponsabilidad'",
        "durationMinutes": 20,
        "objective": "Visualizar el equilibrio necesario entre la escuela y el hogar para sostener el desarrollo del estudiante.",
        "facilitatorScript": "Nos dividiremos en equipos mixtos de docentes y familias. Cada mesa recibirá palitos y bloques. El reto es construir la torre más alta y firme posible, pero con una regla:\\n- Cada piso debe construirse alternando un bloque colocado por la familia y un bloque colocado por el docente.\\nSi uno de los dos lados deja de colocar su parte o suelta la estructura, la torre tambalea y cae. Así de vital es el trabajo conjunto entre la casa y el colegio.",
        "groupDynamics": "Construcción cooperativa en mesas mixtas con reflexión sobre el apoyo mutuo.",
        "reflectionQuestions": [
          "¿Qué pasa en la vida de un estudiante cuando la familia y el colegio no jalan para el mismo lado?",
          "¿Qué compromisos concretos podemos asumir ambas partes a partir de hoy?"
        ]
      },
      {
        "number": 4,
        "title": "Cierre: 'El Árbol de los Compromisos de Corresponsabilidad'",
        "durationMinutes": 10,
        "objective": "Formalizar acuerdos tangibles de buen trato y apoyo mutuo.",
        "facilitatorScript": "Para cerrar, cada familia y docente escribirá en una hoja adhesiva un compromiso concreto (ej: 'Dedicar 15 minutos diarios a conversar sin pantallas con mi hijo', 'Revisar la libreta con palabras de aliento y no con gritos'). Pegaremos nuestras hojas en el árbol mural del aula como testimonio de nuestra alianza protectora. ¡Muchas gracias por su amor y compromiso!",
        "groupDynamics": "Firma y pegado de compromisos en el mural institucional."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "bingo-estilos-crianza",
        "title": "Cartones de Bingo de Estilos de Crianza (Recortables)",
        "description": "Set de 4 cartones de bingo diferentes con casilleros punteados para recortar. Incluye la guía del facilitador con las 16 situaciones cotidianas de estilos autoritario, permisivo, negligente y democrático/asertivo.",
        "type": "RECORTABLE",
        "targetUser": "Familias y Docentes",
        "printInstructions": "Imprimir en hojas A4 (cartulina o papel bond). Recortar los cartones individuales y repartir a los participantes.",
        "fileName": "Bingo_Estilos_Crianza_Familias_SADEX.docx"
      },
      {
        "id": "acuerdos-corresponsabilidad",
        "title": "Ficha de Compromisos y Acuerdos de Corresponsabilidad",
        "description": "Formato oficial para plasmar acuerdos entre la institución y las familias: responsabilidades del hogar, compromisos del docente tutor y seguimiento del DECE.",
        "type": "FICHA_TRABAJO",
        "targetUser": "Representantes Legales y Docentes Tutores",
        "printInstructions": "Imprimir a doble cara. Archivar una copia firmada en la carpeta del tutor y entregar otra a la familia.",
        "fileName": "Ficha_Acuerdos_Corresponsabilidad_Familia_SADEX.docx"
      }
    ]
  },
  {
    "id": "ovp-triatlon-academico",
    "slug": "ovp-triatlon-academico",
    "title": "Feria Lúdica OVP: 'Triatlón Académico de Proyectos de Vida'",
    "subtitle": "Circuito vivencial de exploración vocacional para la elección del Bachillerato en Ciencias, Mecánica y Contabilidad.",
    "category": "DESARROLLO_SOCIOEMOCIONAL",
    "categoryLabel": "Orientación Vocacional y Profesional (OVP)",
    "normativeBase": "Lineamientos de OVP MINEDUC & LOEI Art. 73",
    "targetAudiences": [
      "ESTUDIANTES_SECUNDARIA",
      "DOCENTES"
    ],
    "targetAudienceLabel": "Estudiantes de 9no y 10mo EGB (13 a 15 años) y Docentes de Bachillerato",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "OVP",
    "generalObjective": "Facilitar un circuito de estaciones interactivas de corta duración para que las y los estudiantes de Básica Superior experimenten de forma práctica las habilidades y perfiles de egreso de las ofertas de Bachillerato.",
    "specificObjectives": [
      "Explorar de manera práctica y dinámica las competencias de Ciencias, Mecanizado Técnico y Servicios Contables.",
      "Identificar intereses, habilidades y afinidades personales mediante desafíos vivenciales de 10 minutos.",
      "Registrar el aprendizaje vocacional en el Pasaporte del Triatlón Académico.",
      "Articular los resultados del circuito con la toma de decisión informada para el ingreso a 1ro BGU."
    ],
    "materialsGeneral": [
      "Pasaportes impresos del Triatlón Académico para sellar",
      "Sellos o stickers para cada estación",
      "Insumos de estación de Ciencias (vasos, vinagre, bicarbonato, muestras de laboratorio)",
      "Insumos de estación de Mecánica (mini ensambles, tuercas, rompecabezas mecánicos)",
      "Insumos de estación de Contabilidad (tarjetas de presupuesto, calculadoras, billetes didácticos)"
    ],
    "preliminaryNotes": "La feria se organiza en tres estaciones físicas simultáneas. Los estudiantes rotan en grupos pequeños para que todos vivan la experiencia en primera persona.",
    "phases": [
      {
        "number": 1,
        "title": "Apertura y Entrega del Pasaporte Vocacional",
        "durationMinutes": 10,
        "objective": "Presentar la lógica del Triatlón y motivar la exploración sin estereotipos de género.",
        "facilitatorScript": "¡Bienvenidos al Triatlón Académico! Están a punto de dar un paso emocionante en su vida escolar: elegir la especialidad de Bachillerato que mejor se conecte con sus sueños y talentos.\\n\\nHoy no venimos a escuchar charlas aburridas; venimos a experimentar con nuestras propias manos. A cada uno le entregamos su 'Pasaporte del Triatlón'. Deberán recorrer las 3 estaciones, superar los retos prácticos y obtener los sellos correspondientes. ¡Atrévanse a descubrir talentos que tal vez no sabían que tenían!",
        "groupDynamics": "Organización en escuadras de rotación y entrega de cartillas.",
        "materialsNeeded": [
          "Pasaporte del Triatlón Académico (Material descargable oficial)"
        ]
      },
      {
        "number": 2,
        "title": "Estación 1: 'Exploradores de la Ciencia' (Bachillerato en Ciencias)",
        "durationMinutes": 20,
        "objective": "Experimentar el método científico, la curiosidad analítica y la investigación del mundo natural.",
        "facilitatorScript": "En esta estación son científicos investigadores. Van a realizar un experimento químico controlado de reacción efervescente y observarán al microscopio la estructura celular vegetal. El Bachillerato en Ciencias potencia su curiosidad, su pensamiento lógico y abre puertas hacia carreras de medicina, biotecnología, ingenierías y ciencias sociales.",
        "groupDynamics": "Reto de laboratorio en mesas con reactivos seguros y registro de observaciones."
      },
      {
        "number": 3,
        "title": "Estación 2: 'Desafío de Ensamblaje y Precisión' (Bachillerato Técnico en Mecanizado)",
        "durationMinutes": 20,
        "objective": "Explorar destrezas visoespaciales, ensamble técnico y resolución mecánica de problemas.",
        "facilitatorScript": "¡Bienvenidos al taller técnico! Su misión es ensamblar contra reloj un componente mecánico utilizando herramientas y esquemas de diseño. El Bachillerato Técnico en Mecanizado forma profesionales altamente demandados en la industria productiva, automatización, diseño computarizado y robótica.",
        "groupDynamics": "Desafío de armado por piezas y verificación de precisión de medidas."
      },
      {
        "number": 4,
        "title": "Estación 3: 'El Reto del Presupuesto Estratégico' (Bachillerato en Contabilidad)",
        "durationMinutes": 20,
        "objective": "Desarrollar criterio financiero, gestión de recursos y toma de decisiones económicas.",
        "facilitatorScript": "En esta estación ustedes son los gerentes financieros de un emprendimiento juvenil. Tienen un capital inicial y deben equilibrar costos, gastos e ingresos para que el proyecto sea rentable y éticamente responsable. La Contabilidad y Administración desarrollan su visión estratégica de negocios y gestión empresarial.",
        "groupDynamics": "Juego de simulación presupuestaria con tarjetas de balance."
      },
      {
        "number": 5,
        "title": "Plenaria y Registro de Preferencias Vocacionales",
        "durationMinutes": 20,
        "objective": "Consolidar el pasaporte con los 3 sellos y plasmar la autoevaluación en la matriz DECE.",
        "facilitatorScript": "¡Felicidades a todos los finalistas del Triatlón! Miren sus pasaportes con los 3 sellos completados. Ahora respondan con sinceridad en su cartilla: ¿Cuál estación les hizo perder la noción del tiempo? ¿En cuál sintieron mayor entusiasmo? Estos indicios son la brújula de su Proyecto de Vida. ¡El equipo DECE estará acompañándolos en cada paso de su elección!",
        "groupDynamics": "Cierre festivo, retroalimentación y entrega de incentivos."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "pasaporte-triatlon-ovp",
        "title": "Pasaporte Recortable del Triatlón Académico (Cartilla de Estaciones)",
        "description": "Cartilla plegable imprimible tamaño A4 con casilleros para sellos de Ciencias, Mecánica y Contabilidad, rúbrica de autoevaluación de intereses y cuestionario de toma de decisión para el estudiante.",
        "type": "RECORTABLE",
        "targetUser": "Estudiantes de 9no y 10mo EGB",
        "printInstructions": "Imprimir en cartulina blanca A4 (o papel bond grueso). Plegar por la mitad para formar el cuadernillo pasaporte.",
        "fileName": "Pasaporte_Triatlon_Academico_OVP_SADEX.docx"
      }
    ]
  },
  {
    "id": "autoproteccion-infantil-4-anos",
    "slug": "autoproteccion-infantil-4-anos",
    "title": "Taller Infantil de Autoprotección: 'Yo tengo derecho a ser bien tratado'",
    "subtitle": "Prevención del maltrato institucional y fortalecimiento de la confianza en niñas y niños de Educación Inicial.",
    "category": "PREVENCION_044A",
    "categoryLabel": "Prevención Acuerdo 044-A (Primera Infancia)",
    "normativeBase": "Acuerdo Ministerial MINEDUC-044-A (Prevención de Violencias) & LOEI Art. 73",
    "targetAudiences": [
      "ESTUDIANTES_PRIMARIA",
      "DOCENTES"
    ],
    "targetAudienceLabel": "Niñas y niños de 4 a 6 años (Educación Inicial 2 y 1ro EGB) y Docentes Parvularias",
    "estimatedDuration": "60 minutos",
    "relatedActionPlanTopic": "VIOLENCIA",
    "generalObjective": "Prevenir y detectar oportunamente situaciones de maltrato físico y psicológico mediante dinámicas lúdicas que fomenten el reconocimiento de emociones, la autoprotección y la confianza para expresar cuando algo les genera miedo o tristeza.",
    "specificObjectives": [
      "Reconocer las emociones básicas de alegría, miedo, tristeza y enojo a través de títeres y cuentos.",
      "Identificar conductas de adultos que cruzan límites respetuosos (gritos, castigos físicos, humillaciones).",
      "Entrenar la respuesta asertiva '¡No me gusta, alto!' y la búsqueda de personas protectoras.",
      "Construir un clima escolar seguro sustentado en el buen trato recíproco."
    ],
    "materialsGeneral": [
      "Títere de Nico o muñeco de tela",
      "Fichas recortables del Semáforo del Buen Trato",
      "Medallas recortables para colorear",
      "Crayones gruesos, tijeras punta roma y lanas para colgar medallas"
    ],
    "preliminaryNotes": "Las actividades deben desarrollarse en alfombra o tapete infantil en un ambiente cálido y lúdico. La profesional DECE debe observar con atención gestos de retraimiento o reacciones emocionales de los niños.",
    "phases": [
      {
        "number": 1,
        "title": "Bienvenida y Ronda Afectiva: 'Mi Nombre Brilla'",
        "durationMinutes": 10,
        "objective": "Afianzar la identidad, el sentido de valía y el clima de calidez.",
        "facilitatorScript": "¡Hola mis pequeños soles! Bienvenidos a nuestro círculo mágico. Hoy vamos a cantar nuestra canción de los nombres. Cuando diga tu nombre, vas a dar un aplauso fuerte y todos te diremos: '¡Tu nombre brilla con luz hermosa!'. Porque cada uno de ustedes es un tesoro valioso que merece amor y sonrisas todos los días.",
        "groupDynamics": "Canción de bienvenida con palmas y contacto visual afectivo."
      },
      {
        "number": 2,
        "title": "Cuento con Títere: 'Nico y la Voz Fuerte'",
        "durationMinutes": 15,
        "objective": "Reconocer que los gritos y tratos bruscos no son normales ni aceptables.",
        "facilitatorScript": "(Con títere en mano) Este es Nico. A Nico le encanta pintar dinosaurios. Pero un día, un adulto le gritó muy fuerte y lo zamarreó porque se le cayó una tempera al piso. Nico sintió que su corazoncito latía muy rápido como un tambor y le dieron ganas de llorar. Nico se preguntó: ¿Hice algo malo para que me traten así? ¿Ustedes qué opinan, amiguitos? Cuando nos equivocamos, ¿nos deben gritar o nos deben enseñar con paciencia?",
        "groupDynamics": "Interacción guiada con el títere y preguntas de empatía infantil.",
        "reflectionQuestions": [
          "¿Cómo se pone tu carita cuando alguien te grita muy fuerte?",
          "¿A quién puedes acudir en la escuela si una persona te hace sentir miedo?"
        ]
      },
      {
        "number": 3,
        "title": "Juego Dinámico: 'Sí me gusta / No me gusta'",
        "durationMinutes": 10,
        "objective": "Diferenciar tratos respetuosos de agresiones físicas o verbales.",
        "facilitatorScript": "Nos ponemos de pie. Cuando yo diga algo bonito (ej: 'Un abrazo suave de buenos días', 'Felicitarte cuando intentas algo', 'Prestarte un juguete'), vamos a saltar de alegría con las manos arriba. Pero si digo algo que hace daño (ej: 'Un pellizco', 'Un grito feo', 'Un jalón de orejas', 'Encerrar en el baño'), cruzamos los brazos, damos un paso atrás y decimos bien fuerte: '¡NO ME GUSTA!'.",
        "groupDynamics": "Juego psicomotor de diferenciación corporal de límites."
      },
      {
        "number": 4,
        "title": "Actividad Manual y Recortable: 'El Semáforo del Buen Trato'",
        "durationMinutes": 15,
        "objective": "Plasmar en un semáforo didáctico las acciones que protegen el bienestar infantil.",
        "facilitatorScript": "Vamos a pintar nuestro Semáforo del Buen Trato:\\n- Círculo VERDE: Cosas que nos hacen sonreír (abrazos, cuentos, juegos).\\n- Círculo AMARILLO: Cosas que nos confunden y debemos preguntar a un adulto de confianza.\\n- Círculo ROJO: Cosas que NADIE puede hacernos (golpes, tocar nuestro cuerpo sin permiso, secretos que duelen). Recortamos las manitos y armamos nuestro semáforo protector.",
        "groupDynamics": "Coloreado y recorte con apoyo de docentes parvularias.",
        "materialsNeeded": [
          "Ficha del Semáforo del Buen Trato (Material descargable oficial)"
        ]
      },
      {
        "number": 5,
        "title": "Coronación: 'Medalla del Campeón del Buen Trato'",
        "durationMinutes": 10,
        "objective": "Fijar el compromiso institucional de protección infantil.",
        "facilitatorScript": "A cada una y uno de ustedes les entregamos su Medalla de 'Campeón y Defensor del Buen Trato'. Recuerden siempre: ¡Ustedes tienen derecho a ser felices, a jugar y a que todos los adultos los cuiden con cariño y respeto!",
        "groupDynamics": "Colocación de medallas y abrazo grupal con canción de cierre.",
        "materialsNeeded": [
          "Medallas Recortables 'Defensor del Buen Trato'"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "semaforo-buen-trato-recortable",
        "title": "Ficha Recortable: 'El Semáforo del Buen Trato Infantil'",
        "description": "Lámina ilustrada en blanco y negro con la silueta de un semáforo grande y 6 figuras recortables (manos de caricias, libros, signos de alto) para clasificar lo que sí está permitido y lo que nunca debe tolerarse en el aula.",
        "type": "RECORTABLE",
        "targetUser": "Niños de Educación Inicial y 1ro EGB",
        "printInstructions": "Imprimir en hoja bond A4 para que los niños pinten con crayones y peguen con pegamento escolar.",
        "fileName": "Ficha_Recortable_Semaforo_Buen_Trato_SADEX.docx"
      },
      {
        "id": "medallas-campeon-buen-trato",
        "title": "Medallas Recortables: 'Defensor del Buen Trato'",
        "description": "Plancha con 6 medallas circulares recortables listas para pintar, perforar en la parte superior y colocar una lana para que los niños las lleven puestas a casa.",
        "type": "RECORTABLE",
        "targetUser": "Estudiantes de Educación Inicial",
        "printInstructions": "Imprimir en cartulina blanca A4. Recortar por los círculos punteados.",
        "fileName": "Medallas_Recortables_Buen_Trato_Infantil_SADEX.docx"
      }
    ]
  },
  {
    "id": "riesgos-psicosociales-epilepsia",
    "slug": "riesgos-psicosociales-epilepsia",
    "title": "Taller para Docentes: 'Detección Temprana de Riesgos y Primeros Auxilios ante Crisis Epilépticas'",
    "subtitle": "Herramientas de aula para identificar ansiedad, depresión y riesgo suicida, y protocolo médico ante crisis convulsivas.",
    "category": "PRIMEROS_AUXILIOS_PAP",
    "categoryLabel": "Salud Mental y Emergencias en Aula",
    "normativeBase": "Protocolos Intersectoriales MINEDUC - MSP & LOEI Art. 73",
    "targetAudiences": [
      "DOCENTES",
      "PROFESIONALES_DECE",
      "COMUNIDAD_EDUCATIVA"
    ],
    "targetAudienceLabel": "Personal Docente, Inspectores y Autoridades Institucionales",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "SALUD_MENTAL",
    "generalObjective": "Capacitar al personal docente en la detección temprana de indicadores de ansiedad, depresión y riesgo suicida en estudiantes, dotándolos simultáneamente del protocolo oficial de primeros auxilios ante crisis epilépticas o convulsivas en el entorno escolar.",
    "specificObjectives": [
      "Identificar los signos tempranos de trastornos de ansiedad y cuadros depresivos que se manifiestan en el rendimiento y conducta escolar.",
      "Reconocer las manifestaciones clínicas de una crisis epiléptica (tónico-clónica, ausencias) desmitificando creencias populares peligrosas.",
      "Entrenar el paso a paso de primeros auxilios ante convulsiones: proteger la cabeza, posición lateral de seguridad y control del tiempo.",
      "Aplicar el protocolo de las 10 situaciones de alerta psicosocial mediante tarjetas de análisis en subgrupos."
    ],
    "materialsGeneral": [
      "Tarjetas de las 10 situaciones de alerta impresas",
      "Guía de bolsillo de primeros auxilios en epilepsia",
      "Cronómetro o reloj para práctica de toma de tiempos",
      "Colchoneta para demostración práctica de posición lateral de seguridad"
    ],
    "preliminaryNotes": "Se debe enfatizar la regla de oro médica ante convulsiones: ¡NUNCA introducir objetos ni dedos en la boca de una persona que convulsiona!",
    "phases": [
      {
        "number": 1,
        "title": "Apertura y Contextualización: 'Nuestra Respuesta ante lo Inesperado'",
        "durationMinutes": 10,
        "objective": "Evaluar las reacciones docentes iniciales y establecer la necesidad de protocolos estandarizados.",
        "facilitatorScript": "Compañeros docentes: El aula no es solo un espacio pedagógico; es un entorno vivo donde convergen dolores emocionales silenciosos y emergencias médicas imprevistas. ¿Cómo reaccionamos cuando un estudiante comienza a hiperventilar antes de un examen? ¿O cuando un alumno se desvanece y empieza a convulsionar frente a todo el grado?\\n\\nEl miedo y la improvisación son nuestros peores enemigos. Hoy aprenderemos a actuar con serenidad, técnica y rigor para salvar vidas y proteger la dignidad de nuestros estudiantes.",
        "groupDynamics": "Pregunta detonante rápida en tarjetas."
      },
      {
        "number": 2,
        "title": "Módulo Psicosocial: Detección de Ansiedad, Depresión y Riesgo Autolítico",
        "durationMinutes": 20,
        "objective": "Reconocer las diferencias clínicas y el manejo en aula de descompensaciones emocionales.",
        "facilitatorScript": "Revisemos las señales:\\n- En ANSIEDAD: Taquicardia, sudoración, bloqueo cognitivo y temblores. Necesita respiración diafragmática y presencia tranquilizadora.\\n- En DEPRESIÓN: Apatía sostenida, abandono del cuidado personal, frases de desesperanza y mutismo.\\n- En RIESGO SUICIDA: Cualquier mención explícita o indirecta exige no dejar solo al estudiante y activar la Ficha de Alerta al DECE en el mismo instante.",
        "groupDynamics": "Exposición dialogada con tabla comparativa de síntomas."
      },
      {
        "number": 3,
        "title": "Módulo Médico-Escolar: Protocolo de Primeros Auxilios ante Crisis Epilépticas",
        "durationMinutes": 25,
        "objective": "Dominar las maniobras de auxilio y erradicar mitos lesivos ante convulsiones.",
        "facilitatorScript": "Si un estudiante convulsiona en su aula, sigan estos 5 pasos inmutables:\\n1. CONSERVE LA CALMA Y MIRE EL RELOJ: Cronometre la crisis. Si dura más de 5 minutos, active ECU-911 de inmediato.\\n2. PROTEJA LA CABEZA: Coloque una chaqueta o almohada bajo su cabeza para evitar traumatismos contra el piso.\\n3. DESPEJE EL ESPACIO: Aparte pupitres y pida a los compañeros que se retiren ordenadamente para darle ventilación y privacidad.\\n4. NUNCA META NADA EN SU BOCA: No intente sujetar la lengua ni meter cucharas ni dedos; puede fracturar la mandíbula o ahogar al estudiante.\\n5. POSICIÓN LATERAL DE SEGURIDAD: Una vez que cesen los espasmos, gírelo suavemente de lado para que respire bien y no aspire secreciones.",
        "groupDynamics": "Demostración en vivo de la Posición Lateral de Seguridad (PLS) con voluntarios.",
        "materialsNeeded": [
          "Guía de Bolsillo de Primeros Auxilios en Epilepsia"
        ]
      },
      {
        "number": 4,
        "title": "Taller en Subgrupos: 'Las 10 Situaciones de Alerta en Aula'",
        "durationMinutes": 25,
        "objective": "Aplicar los protocolos aprendidos a situaciones reales simuladas.",
        "facilitatorScript": "Vamos a dividirnos en mesas. A cada mesa le entregamos tarjetas con las 10 situaciones reales anonimizadas (desde el estudiante con insomnio y bajas notas hasta la crisis epiléptica en laboratorio). Cada grupo definirá qué paso inmediato dar y qué formato del DECE activar.",
        "groupDynamics": "Análisis de casos con las tarjetas recortables y retroalimentación plenaria.",
        "materialsNeeded": [
          "Tarjetas Recortables de las 10 Situaciones de Alerta (Material descargable)"
        ]
      },
      {
        "number": 5,
        "title": "Cierre, Fichas de Alerta y Coordinación Intersectorial",
        "durationMinutes": 10,
        "objective": "Fijar las vías de comunicación con el MSP, DECE y familias.",
        "facilitatorScript": "Toda crisis médica o psicosocial atendida debe registrarse de inmediato en la Ficha de Notificación de Alerta del DECE para que se coordine el seguimiento con el centro de salud y la familia. Gracias colegas por ser la primera línea de protección de nuestra niñez.",
        "groupDynamics": "Entrega de protocolo de bolsillo y despedida."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "tarjetas-casos-alerta-aula",
        "title": "Tarjetas Recortables: '10 Situaciones de Alerta Psicosocial y Médica'",
        "description": "Lámina con las 10 situaciones de simulación divididas por líneas de corte punteadas: casos de pánico pre-examen, aislamiento depresivo, ideación autolítica, ausentismo por estrés y convulsiones en clase.",
        "type": "RECORTABLE",
        "targetUser": "Docentes de Todos los Niveles",
        "printInstructions": "Imprimir en hoja A4 y recortar las tarjetas individuales para dinámicas de trabajo en grupos.",
        "fileName": "Tarjetas_Casos_Alerta_Aula_Epilepsia_SADEX.docx"
      },
      {
        "id": "protocolo-bolsillo-epilepsia",
        "title": "Protocolo de Bolsillo: Primeros Auxilios ante Crisis Epiléptica en Aula",
        "description": "Guía rápida plastificable para docentes con el flujograma visual de los 5 pasos obligatorios, la maniobra PLS (Posición Lateral de Seguridad) y la lista de prohibiciones médicas.",
        "type": "GUIA_BOLSILLO",
        "targetUser": "Personal Docente y Administrativo",
        "printInstructions": "Imprimir a color en hoja A4 plegable en dos caras. Ideal para tener en el botiquín del aula o carpeta docente.",
        "fileName": "Protocolo_Bolsillo_Primeros_Auxilios_Epilepsia_SADEX.docx"
      }
    ]
  },
  {
    "id": "discriminacion-racismo-interculturalidad",
    "slug": "discriminacion-racismo-interculturalidad",
    "title": "Taller para Docentes: 'Educar desde la Interculturalidad y sin Racismo'",
    "subtitle": "Pautas pedagógicas para prevenir, detectar y abordar la discriminación racial, xenofobia y exclusión escolar.",
    "category": "PREVENCION_044A",
    "categoryLabel": "Convivencia Intercultural (044-A)",
    "normativeBase": "Lineamientos de Convivencia Intercultural MINEDUC & LOEI Art. 73",
    "targetAudiences": [
      "DOCENTES",
      "COMUNIDAD_EDUCATIVA",
      "PROFESIONALES_DECE"
    ],
    "targetAudienceLabel": "Docentes de Inicial a Bachillerato y Equipos de Convivencia Escolar",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "CONVIVENCIA",
    "generalObjective": "Fortalecer las capacidades del personal docente para prevenir, detectar y abordar situaciones de racismo, discriminación y xenofobia, promoviendo prácticas pedagógicas inclusivas que celebren la diversidad cultural de la comunidad educativa.",
    "specificObjectives": [
      "Distinguir con precisión los conceptos de estereotipo, prejuicio, discriminación y racismo estructural.",
      "Identificar microagresiones verbales cotidianas en los pasillos y aulas que vulneran la dignidad de estudiantes afrodescendientes, indígenas y migrantes.",
      "Aplicar dinámicas de desarticulación de prejuicios en el ejercicio docente.",
      "Elaborar un Decálogo Institucional de Convivencia Intercultural y Cultura de Paz."
    ],
    "materialsGeneral": [
      "Tarjetas de frases y microagresiones para análisis",
      "Láminas del Árbol de las Raíces Culturales",
      "Papelógrafos y marcadores para el decálogo",
      "Post-its de colores para compromisos docentes"
    ],
    "preliminaryNotes": "El facilitador debe fomentar un debate autocrítico y respetuoso, reconociendo que muchas formas de racismo operan de manera sutil o normalizada en el lenguaje cotidiano.",
    "phases": [
      {
        "number": 1,
        "title": "Activación: '¿Lo Has Escuchado Antes en el Colegio?'",
        "durationMinutes": 15,
        "objective": "Desnaturalizar frases discriminatorias normalizadas en la cultura escolar.",
        "facilitatorScript": "Compañeros docentes: Iniciemos escuchando frases que a veces se pronuncian en colegios sin medir su impacto destructivo:\\n- 'Esos estudiantes no se integran porque no saben comportarse'.\\n- 'Esa niña debería peinarse mejor, con ese pelo afro no se ve formal'.\\n- 'Aquí hablamos bien el español, no como en tu país'.\\n\\n¿Qué prejuicio se esconde detrás de estas palabras? ¿Qué herida dejan en la identidad y autoestima de un niño o adolescente que escucha esto de sus propios maestros o compañeros?",
        "groupDynamics": "Lectura de tarjetas de frases y reflexión guiada.",
        "reflectionQuestions": [
          "¿Por qué tendemos a asumir que nuestra cultura o forma de hablar es la 'correcta' y las demás son 'raras'?",
          "¿Cómo impacta el racismo en el rendimiento académico y la deserción escolar?"
        ]
      },
      {
        "number": 2,
        "title": "Encuadre Conceptual: La Escalera de la Discriminación",
        "durationMinutes": 20,
        "objective": "Comprender cómo un estereotipo no frenado puede escalar a violencia y exclusión.",
        "facilitatorScript": "El racismo no empieza con agresiones físicas; empieza en el pensamiento con ESTEREOTIPOS (generalizaciones simplistas), avanza hacia PREJUICIOS (juicios de valor despectivos sin conocer a la persona), se materializa en DISCRIMINACIÓN (trato desigual y privación de oportunidades) y puede terminar en VIOLENCIA o acoso escolar sistémico. Nuestra misión pedagógica es romper esa escalera en el primer peldaño.",
        "groupDynamics": "Exposición visual de la Escalera de la Discriminación."
      },
      {
        "number": 3,
        "title": "Dinámica en Grupos: 'El Árbol de la Diversidad y la Interculturalidad'",
        "durationMinutes": 25,
        "objective": "Valorar los aportes de las diversas culturas presentes en la institución educativa.",
        "facilitatorScript": "En equipos de trabajo vamos a analizar situaciones reales de exclusión en el aula y propondremos alternativas pedagógicas que conviertan la diferencia en una fuente de riqueza colectiva. Por ejemplo: ¿Cómo incorporamos la gastronomía, saberes ancestrales y literatura afroecuatoriana e indígena en nuestras planificaciones curriculares de clase?",
        "groupDynamics": "Mesas de trabajo por subniveles con tarjetas de casos.",
        "materialsNeeded": [
          "Tarjetas de Frases y Casos de Discriminación (Material recortable)"
        ]
      },
      {
        "number": 4,
        "title": "Construcción Colectiva: Decálogo de la Escuela Intercultural",
        "durationMinutes": 20,
        "objective": "Traducir la reflexión en normas claras de convivencia escolar inclusiva.",
        "facilitatorScript": "Redactemos entre todos nuestro Decálogo Institucional. Normas claras como: 'En nuestra institución el acento, color de piel y origen cultural son motivo de orgullo, nunca de burla', 'Cero tolerancia a apodos racistas en el aula y patio'.",
        "groupDynamics": "Redacción plenaria del decálogo en papelógrafo mural."
      },
      {
        "number": 5,
        "title": "Cierre y Compromiso Pedagógico",
        "durationMinutes": 10,
        "objective": "Firmar el pacto ético docente por la dignidad y la equidad.",
        "facilitatorScript": "Educar para la interculturalidad es educar para la justicia. Cada uno firma su tarjeta de compromiso personal para erradicar cualquier sesgo en el trato con sus estudiantes. ¡Muchas gracias!",
        "groupDynamics": "Firma del Decálogo de la Convivencia Intercultural."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "tarjetas-frases-estereotipos",
        "title": "Tarjetas Recortables: 'Frases y Microagresiones para el Debate Docente'",
        "description": "Contiene 8 tarjetas recortables con frases cotidianas de estereotipos y prejuicios raciales y xenófobos en el contexto escolar ecuatoriano, acompañadas de preguntas de deconstrucción para mesas de trabajo.",
        "type": "RECORTABLE",
        "targetUser": "Docentes y Directivos",
        "printInstructions": "Imprimir en hoja A4 y recortar por los bordes para repartir una frase a cada pareja de educadores.",
        "fileName": "Tarjetas_Debate_Racismo_y_Microagresiones_SADEX.docx"
      },
      {
        "id": "decalogo-convivencia-intercultural",
        "title": "Decálogo y Compromiso por una Escuela Inclusiva e Intercultural",
        "description": "Plantilla institucional para publicar en las salas de profesores y carteleras con los 10 principios de no discriminación y espacios para firmas de compromiso del equipo docente.",
        "type": "FICHA_TRABAJO",
        "targetUser": "Comunidad Educativa",
        "printInstructions": "Imprimir en formato cartel A4 o A3 para exhibir en el plantel.",
        "fileName": "Decalogo_Escuela_Intercultural_Inclusiva_SADEX.docx"
      }
    ]
  },
  {
    "id": "diversidad-rostros-historias",
    "slug": "diversidad-rostros-historias",
    "title": "Taller de Sensibilización: 'Diversidad Institucional y Miradas sin Prejuicios'",
    "subtitle": "Historias reales impactantes para desafiar las etiquetas externas y valorar la dignidad interior de cada ser humano.",
    "category": "DESARROLLO_SOCIOEMOCIONAL",
    "categoryLabel": "Inclusión y Empatía Social",
    "normativeBase": "Modelo de Inclusión Educativa MINEDUC & LOEI Art. 73",
    "targetAudiences": [
      "ESTUDIANTES_SECUNDARIA",
      "DOCENTES"
    ],
    "targetAudienceLabel": "Estudiantes de Básica Media, Superior y Bachillerato",
    "estimatedDuration": "60 minutos",
    "relatedActionPlanTopic": "CONVIVENCIA",
    "generalObjective": "Sensibilizar a los participantes sobre el peligro de juzgar a las personas por su apariencia física, condición económica o estilo de vida, explorando historias biográficas que evidencian la complejidad, grandeza y dignidad humana.",
    "specificObjectives": [
      "Cuestionar los sesgos inconscientes que aplicamos automáticamente al ver a alguien por primera vez.",
      "Analizar biografías contrastantes (el Dr. Umar Khan, Julius Lederer, Vladimir Franz) para comprender la diversidad humana.",
      "Fomentar la escucha activa y la compasión frente a situaciones de vulnerabilidad o exclusión social.",
      "Elaborar un manifiesto grupal contra el estigma y las etiquetas fáciles en la escuela."
    ],
    "materialsGeneral": [
      "Tarjetas de historias biográficas impresas",
      "Fotografías o siluetas de personajes para dinámica ciega",
      "Hojas para redacción de reflexiones personales"
    ],
    "preliminaryNotes": "Dinámica potente de impacto emocional. Se recomienda mostrar primero las fotos o datos externos sin revelar la profesión o historia, permitiendo que los estudiantes expresen sus hipótesis iniciales antes de conocer la verdad.",
    "phases": [
      {
        "number": 1,
        "title": "Dinámica Inicial: '¿Quién Crees que Soy?'",
        "durationMinutes": 15,
        "objective": "Evidenciar cómo los prejuicios externos sesgan nuestra percepción.",
        "facilitatorScript": "Buenos días. Les voy a mostrar tres perfiles anónimos:\\n1. Una persona tatuada de pies a cabeza en el rostro.\\n2. Un hombre que vivió años en la indigencia cubierto con bolsas de basura.\\n3. Un médico en una zona remota de África.\\nSi tuvieran que elegir a quién pedir un consejo legal, quién es un héroe de la humanidad y quién tiene una historia artística asombrosa, ¿a quién elegirían? Vamos a descubrir qué hay detrás de las apariencias.",
        "groupDynamics": "Juego de deducción y contrastación de hipótesis."
      },
      {
        "number": 2,
        "title": "Lectura Dramatizada: Historias que Desafían Prejuicios",
        "durationMinutes": 25,
        "objective": "Profundizar en las biografías del Dr. Khan, Julius Lederer y Vladimir Franz.",
        "facilitatorScript": "Revisemos estas historias reales:\\n- El Dr. Umar Khan fue un científico héroe que dio su vida combatiendo el ébola en Sierra Leona.\\n- Vladimir Franz, con su rostro tatuado, es un eminente catedrático universitario, abogado, pintor y compositor musical de renombre mundial.\\n- Julius Lederer fue un hombre educado que decidió renunciar al consumo material para vivir en libertad interior y respeto.\\n¿Por qué la sociedad tiende a etiquetar a las personas por una foto antes de conocer su alma?",
        "groupDynamics": "Lectura en subgrupos de las tarjetas recortables de historias.",
        "materialsNeeded": [
          "Tarjetas Recortables de Historias de Diversidad (Material descargable)"
        ]
      },
      {
        "number": 3,
        "title": "Plenaria: 'El Espejo en Nuestro Colegio'",
        "durationMinutes": 10,
        "objective": "Aterrizar la lección al entorno escolar y las relaciones entre compañeros.",
        "facilitatorScript": "¿A cuántos compañeros de este colegio los hemos juzgado por su ropa, su timidez, su corte de pelo o su barrio sin saber la historia valiente que llevan por dentro? A partir de hoy, ¿cómo nos comprometemos a mirar a los demás?",
        "reflectionQuestions": [
          "¿Alguna vez te has sentido juzgado injustamente por algo externo?",
          "¿Qué se necesita para mirar a otra persona con verdadera empatía?"
        ]
      },
      {
        "number": 4,
        "title": "Cierre: Manifiesto por una Mirada Libre de Etiquetas",
        "durationMinutes": 10,
        "objective": "Consolidar el compromiso del respeto a la diversidad.",
        "facilitatorScript": "Escribamos en nuestra tarjeta una promesa de respeto: 'Prometo mirar más allá de la apariencia y reconocer la dignidad única de cada ser humano'. ¡Gracias a todos!",
        "groupDynamics": "Pegado de compromisos en el mural de aula."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "tarjetas-historias-diversidad",
        "title": "Tarjetas Recortables: 'Historias Reales que Rompen Estereotipos'",
        "description": "Set de 4 tarjetas recortables con las biografías completas y preguntas de análisis sobre el Dr. Umar Khan, Julius Lederer y Vladimir Franz para dinámicas de debate ético en el aula.",
        "type": "RECORTABLE",
        "targetUser": "Estudiantes de Secundaria y Docentes",
        "printInstructions": "Imprimir en hoja bond A4 a doble cara y recortar las tarjetas de trabajo.",
        "fileName": "Tarjetas_Historias_Diversidad_y_Prejuicios_SADEX.docx"
      }
    ]
  },
  {
    "id": "comunicacion-asertiva-objeto",
    "slug": "comunicacion-asertiva-objeto",
    "title": "Taller Vivencial: 'Comunicación Asertiva: El Objeto que no Dice su Nombre'",
    "subtitle": "Dinámica simbólica e introspectiva para fortalecer la asertividad y el clima de relaciones institucionales.",
    "category": "DESARROLLO_SOCIOEMOCIONAL",
    "categoryLabel": "Habilidades para la Vida y Convivencia",
    "normativeBase": "Modelo de Prevención DECE & LOEI Art. 73",
    "targetAudiences": [
      "DOCENTES",
      "ESTUDIANTES_SECUNDARIA",
      "PROFESIONALES_DECE"
    ],
    "targetAudienceLabel": "Personal Docente, Administrativo y Estudiantes de Bachillerato",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "SOCIOEMOCIONAL",
    "generalObjective": "Desarrollar habilidades de comunicación asertiva, escucha activa y resolución pacífica de discrepancias en el entorno escolar mediante dinámicas proyectivas y el entrenamiento en 'Mensajes Yo'.",
    "specificObjectives": [
      "Identificar el propio estilo comunicativo (pasivo, agresivo, pasivo-agresivo o asertivo) y sus consecuencias en las relaciones interpersonales.",
      "Utilizar la metáfora de objetos cotidianos para expresar inquietudes y vivencias laborales o académicas de forma segura.",
      "Aprender a estructurar peticiones y límites firmes sin recurrir a la agresividad ni al silencio sumiso ('Técnica del Mensaje Yo').",
      "Fortalecer el clima de confianza y trabajo en equipo institucional."
    ],
    "materialsGeneral": [
      "Mesa central con objetos variados (piedras, llaves, sogas, espejos, cuerdas, clips, botellitas)",
      "Tarjetas de entrenamiento en 'Mensajes Yo'",
      "Música instrumental suave de fondo",
      "Hojas y bolígrafos para compromisos de comunicación"
    ],
    "preliminaryNotes": "La dinámica con objetos permite proyectar emociones sin exponerse de manera vulnerable de golpe, facilitando la participación incluso de las personas más reservadas.",
    "phases": [
      {
        "number": 1,
        "title": "Dinámica Proyectiva: 'El Objeto que no Dice su Nombre'",
        "durationMinutes": 25,
        "objective": "Facilitar una conexión simbólica profunda sobre el propio rol en la institución.",
        "facilitatorScript": "Bienvenidos. En la mesa central hay diversos objetos: una piedra pesada, una cuerda con nudos, una llave dorada, un espejo, un clip flexible...\\n\\nSin hablar, cada participante se acercará a la mesa y tomará un objeto que de alguna manera represente cómo se siente en su comunicación cotidiana dentro de esta institución. ¿Se siente como un nudo apretado? ¿Como un clip que debe adaptarse a todo? ¿Como una llave que busca abrir puertas cerradas? Luego nos sentaremos en círculo y compartiremos brevemente por qué elegimos ese objeto.",
        "groupDynamics": "Elección silenciosa de objeto y ronda reflexiva de escucha empática.",
        "reflectionQuestions": [
          "¿Por qué a veces es más fácil expresar lo que sentimos a través de una metáfora que con palabras directas?",
          "¿Qué objeto te gustaría llegar a ser en tu comunicación con los demás?"
        ]
      },
      {
        "number": 2,
        "title": "Taller Técnico: Los 3 Estilos de Comunicación y el 'Mensaje Yo'",
        "durationMinutes": 25,
        "objective": "Aprender la fórmula técnica de la comunicación asertiva sin agresión ni sumisión.",
        "facilitatorScript": "Analicemos los tres estilos:\\n- PASIVO: Se calla, acumula resentimiento y no defiende sus derechos por miedo al conflicto.\\n- AGRESIVO: Ataca, interrumpe, culpa con 'Tú siempre...' o 'Tú nunca...' y daña el vínculo.\\n- ASERTIVO: Expresa lo que piensa y siente con respeto, claridad y firmeza.\\n\\nLa fórmula mágica del 'Mensaje Yo' es:\\n'Cuando ocurre [hecho objetivo sin juzgar], yo me siento [mi emoción], porque necesito [mi necesidad]. Por eso te propongo [acuerdo concreto]'.",
        "groupDynamics": "Exposición dialogada y práctica de reescritura de quejas a 'Mensajes Yo'."
      },
      {
        "number": 3,
        "title": "Laboratorio en Parejas: Desactivando Conversaciones Difíciles",
        "durationMinutes": 25,
        "objective": "Entrenar la fórmula del 'Mensaje Yo' en situaciones tensas simuladas.",
        "facilitatorScript": "En parejas vamos a tomar una tarjeta de situación conflictiva (ej: un colega que no entrega su parte a tiempo, un docente que le grita a otro en el pasillo, un estudiante que interrumpe). Un compañero planteará la situación con ataque y el otro responderá aplicando el 'Mensaje Yo' hasta transformar el choque en un acuerdo constructivo.",
        "groupDynamics": "Juego de roles cruzado con retroalimentación.",
        "materialsNeeded": [
          "Tarjetas de Entrenamiento en Mensajes Yo (Material recortable descargable)"
        ]
      },
      {
        "number": 4,
        "title": "Cierre y Devolución de Objetos",
        "durationMinutes": 15,
        "objective": "Cerrar el ciclo simbólico y asumir compromisos de asertividad.",
        "facilitatorScript": "Vamos a devolver nuestros objetos a la mesa, agradeciendo lo que nos permitieron ver hoy. Cada uno se lleva en su bolsillo su tarjeta de 'Mensaje Yo' para recordarla antes de responder en caliente en su día a día. ¡Gracias por su valentía para comunicarse desde el corazón y el respeto!",
        "groupDynamics": "Acto simbólico de cierre y aplauso grupal."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "tarjetas-mensajes-yo-asertividad",
        "title": "Tarjetas Recortables: 'Guía Práctica del Mensaje Yo y Comunicación Asertiva'",
        "description": "Set de 4 tarjetas recortables con la estructura paso a paso para formular peticiones asertivas, ejemplos de transformación de reclamos agresivos a acuerdos constructivos y guía rápida para desacuerdos.",
        "type": "RECORTABLE",
        "targetUser": "Docentes, Personal Administrativo y Familias",
        "printInstructions": "Imprimir en cartulina A4 y recortar en formato tarjeta de bolsillo.",
        "fileName": "Tarjetas_Entrenamiento_Mensaje_Yo_Asertividad_SADEX.docx"
      }
    ]
  },
  {
    "id": "redes-apoyo-bienestar-emocional",
    "slug": "redes-apoyo-bienestar-emocional",
    "title": "Taller Vivencial: 'Construyendo Redes de Apoyo y Bienestar Emocional'",
    "subtitle": "Rueda de las emociones, árbol de fortalezas internas y activación de recursos protectores entre pares.",
    "category": "PREVENCION_044A",
    "categoryLabel": "Salud Mental y Resiliencia (044-A)",
    "normativeBase": "Acuerdo Ministerial MINEDUC-044-A (Salud Mental) & LOEI Art. 73",
    "targetAudiences": [
      "ESTUDIANTES_SECUNDARIA",
      "COMUNIDAD_EDUCATIVA"
    ],
    "targetAudienceLabel": "Estudiantes de Básica Superior y Bachillerato",
    "estimatedDuration": "60 minutos",
    "relatedActionPlanTopic": "SALUD_MENTAL",
    "generalObjective": "Brindar herramientas vivenciales a las y los estudiantes para identificar y nombrar sus emociones, reconocer su red protectora de personas de confianza y desarrollar habilidades de resiliencia y autocuidado diario.",
    "specificObjectives": [
      "Ampliar el vocabulario emocional utilizando la Rueda de las Emociones para identificar estados anímicos con precisión.",
      "Reconocer a los integrantes clave de la propia red de apoyo en la familia, colegio y comunidad.",
      "Construir colectivamente el Árbol de las Fortalezas Resilientes.",
      "Elaborar un Frasco de Gratitud y Recursos de Emergencia Emocional."
    ],
    "materialsGeneral": [
      "Láminas de la Rueda de las Emociones impresas",
      "Fichas del Árbol de Fortalezas y Redes de Apoyo",
      "Papeles adhesivos de colores y marcadores",
      "Frasco o maceta transparente para dinámica de cierre",
      "Tijeras y pegamento escolar"
    ],
    "preliminaryNotes": "Espacio de calidez y contención entre pares. Muy útil para semanas previas a evaluaciones o cierres de trimestre.",
    "phases": [
      {
        "number": 1,
        "title": "Bienvenida y Dinámica: 'La Rueda de las Emociones'",
        "durationMinutes": 15,
        "objective": "Superar el clásico 'estoy bien' o 'estoy mal' nombrando la emoción real.",
        "facilitatorScript": "¡Hola a todas y todos! Bienvenidos a este espacio seguro. Muchas veces cuando alguien nos pregunta cómo estamos, respondemos en automático: 'bien'. Pero por dentro podemos sentirnos abrumados, decepcionados, nostálgicos, entusiasmados o frustrados.\\n\\nCada uno tiene en su pupitre la 'Rueda de las Emociones'. Miren los colores y las palabras. Vamos a señalar con nuestro lápiz las 2 emociones que mejor describen cómo nos hemos sentido esta última semana. Nombrar lo que sentimos es el primer paso para gobernarlo y encontrar paz.",
        "groupDynamics": "Identificación individual en la rueda y puesta en común voluntaria.",
        "materialsNeeded": [
          "Ficha de la Rueda de las Emociones (Material recortable descargable)"
        ]
      },
      {
        "number": 2,
        "title": "Actividad Central: 'El Árbol de Mis Redes de Apoyo'",
        "durationMinutes": 25,
        "objective": "Mapear a las personas reales a las que el estudiante puede acudir en momentos de crisis.",
        "facilitatorScript": "Vamos a dibujar y recortar nuestro 'Árbol de Redes de Apoyo':\\n- En las RAÍCES escribiremos nuestras fortalezas personales (lo que nos sostiene cuando hay viento fuerte).\\n- En el TRONCO pondremos nuestras rutinas de autocuidado (lo que nos da energía).\\n- En las RAMAS colocaremos los nombres y teléfonos de nuestras personas protectoras: ¿Quién en tu casa te escucha de verdad? ¿Qué amigo nunca te juzga? ¿Qué profesor o profesional del DECE te da tranquilidad? Nadie tiene que atravesar una tormenta en soledad.",
        "groupDynamics": "Construcción individual del árbol con pegado de hojas protectoras.",
        "materialsNeeded": [
          "Ficha del Árbol de Redes de Apoyo"
        ]
      },
      {
        "number": 3,
        "title": "Dinámica Simbólica: 'El Frasco de la Gratitud y Esperanza'",
        "durationMinutes": 15,
        "objective": "Sembrar recursos de optimismo y apoyo mutuo para el aula.",
        "facilitatorScript": "En este frasco transparente vamos a depositar una palabra de gratitud o un deseo sincero para nuestro grado. Este frasco quedará en el aula como nuestro cofre de luz: si un día alguien se siente triste, podrá abrir el frasco y leer uno de estos mensajes que sus propios compañeros escribieron con el corazón.",
        "groupDynamics": "Llenado colectivo del frasco con música reflexiva."
      },
      {
        "number": 4,
        "title": "Cierre y Directorio de Ayuda",
        "durationMinutes": 5,
        "objective": "Recordar los canales oficiales de asistencia médica y psicológica.",
        "facilitatorScript": "Recuerden llevar su Árbol de Redes de Apoyo pegado en su cuaderno. Y no olviden que el DECE de nuestra institución está siempre con las puertas abiertas para ustedes. ¡Cuidarnos es amarnos!",
        "groupDynamics": "Aplauso colectivo y cierre del taller."
      }
    ],
    "downloadableMaterials": [
      {
        "id": "rueda-emociones-arbol-apoyo",
        "title": "Ficha Recortable: 'La Rueda de las Emociones y el Árbol de Redes de Apoyo'",
        "description": "Contiene la Rueda de Emociones ilustrada con círculos concéntricos de intensidad emocional y la plantilla del Árbol de Fortalezas con raíces, tronco y ramas para recortar y mapear personas de auxilio.",
        "type": "RECORTABLE",
        "targetUser": "Estudiantes de Básica Superior y Bachillerato",
        "printInstructions": "Imprimir en cartulina o papel bond A4 a color o blanco y negro.",
        "fileName": "Ficha_Recortable_Rueda_Emociones_y_Arbol_Apoyo_SADEX.docx"
      }
    ]
  },
  {
    "id": "acuerdo-015a-celulares-aula",
    "slug": "acuerdo-015a-celulares-aula",
    "title": "Socialización Acuerdo Ministerial 015-A: Uso de Celulares y Dispositivos en el Aula",
    "subtitle": "Convivencia digital responsable, directrices pedagógicas y compromisos de cumplimiento institucional",
    "category": "prevencion",
    "categoryLabel": "Prevención Integral y Normativa",
    "normativeBase": "Acuerdo Ministerial MINEDUC-MINEDUC-2025-00015-A y Código de Convivencia Escolar",
    "targetAudiences": [
      "docentes",
      "autoridades",
      "comunidad"
    ],
    "targetAudienceLabel": "Personal Docente de todos los Subniveles, Inspectores y Directivos",
    "estimatedDuration": "60 minutos",
    "relatedActionPlanTopic": "Uso seguro, crítico y responsable de entornos digitales y dispositivos móviles",
    "generalObjective": "Socializar de manera clara, práctica y reflexiva la normativa ministerial 015-A sobre la regulación de celulares y dispositivos tecnológicos en instituciones educativas, estableciendo acuerdos viables para el Código de Convivencia.",
    "specificObjectives": [
      "Distinguir con precisión la normativa aplicable por subniveles (prohibición estricta en Inicial/Básica vs. uso pedagógico guiado en Bachillerato).",
      "Identificar las excepciones normativas legítimas (salud, NEE/discapacidad evaluada por UDAI, necesidades comunicativas y emergencias).",
      "Acordar compromisos éticos docentes: gestión pedagógica vs. prohibición de uso personal y protección de la imagen estudiantil."
    ],
    "materialsGeneral": [
      "Tarjetas de Trivia Exprés del Acuerdo 015-A",
      "Matriz de Compromisos Institucionales",
      "Cartulinas de debate o pizarra interactiva"
    ],
    "preliminaryNotes": "La socialización no debe plantearse como un acto sancionatorio sino como una oportunidad pedagógica para construir convivencia digital y proteger el bienestar mental de los estudiantes.",
    "phases": [
      {
        "durationMinutes": 5,
        "title": "Apertura: Las 3 Claves del Acuerdo Ministerial 015-A",
        "objective": "Alinear expectativas institucionales y presentar el marco legal del acuerdo.",
        "materials": [
          "Lámina o diapositiva de las 3 claves normativas"
        ],
        "facilitatorScript": "Compañeros docentes y directivos: hoy revisamos lo esencial del Acuerdo 015-A. Las tres claves son: 1) En Inicial y Básica no está permitido el uso; en Bachillerato solo con fin pedagógico y autorización docente. 2) Excepciones claras: salud, discapacidad avalada por UDAI y emergencias. 3) Rol docente: uso exclusivo para gestión pedagógica, sin uso recreativo en aula y prohibición total de difundir imágenes de estudiantes sin consentimiento.",
        "activitySteps": [
          "Presentación del facilitador DECE y encuadre normativo.",
          "Exposición de las 3 claves en lámina visible.",
          "Conexión con el Código de Convivencia institucional."
        ],
        "reflectiveQuestions": [
          "¿Cómo impacta el uso indiscriminado del celular en la atención y la socialización en el recreo?",
          "¿Por qué es vital diferenciar la edad y madurez neurobiológica entre Inicial, Básica y Bachillerato?"
        ]
      },
      {
        "durationMinutes": 20,
        "title": "Actividad 1 – Trivia Exprés por Equipos (10 Grupos)",
        "objective": "Asegurar la comprensión literal de los artículos del acuerdo mediante preguntas y respuestas ágiles.",
        "materials": [
          "Set de 10 tarjetas de trivia del Acuerdo 015-A"
        ],
        "facilitatorScript": "Vamos a organizarnos en 10 equipos. Cada grupo recibirá una tarjeta de trivia con un caso o pregunta concreta del acuerdo. Tienen 60 segundos para deliberar y dar su veredicto. Quien responda con precisión técnica gana el punto para su equipo.",
        "activitySteps": [
          "División en 10 grupos de trabajo docente.",
          "Distribución de tarjetas numeradas del 1 al 10.",
          "Ronda de respuestas rápidas con feedback técnico inmediato del facilitador."
        ],
        "reflectiveQuestions": [
          "¿Qué se debe hacer si un estudiante con diabetes utiliza el celular para monitorear su glucosa?",
          "¿Puede un docente retener indefinidamente el celular de un estudiante si lo usa sin permiso?"
        ]
      },
      {
        "durationMinutes": 20,
        "title": "Actividad 2 – Dilemas de Aula y Semáforo de Actuación",
        "objective": "Analizar situaciones cotidianas de aula y acordar el protocolo proporcional de intervención.",
        "materials": [
          "Fichas de dilemas y semáforo de actuación"
        ],
        "facilitatorScript": "El acuerdo no busca conflictos diarios en el aula, sino criterios compartidos. Analizaremos 4 escenarios: grabación de un conflicto en el patio, distracción en clase de Básica Media, proyecto de investigación en Bachillerato y llamadas familiares urgentes. ¿Cómo equilibramos la regla con el sentido pedagógico?",
        "activitySteps": [
          "Presentación de 4 casos tipo en pantalla o tarjetas.",
          "Debate en subgrupos: Verde (permitido y pedagógico), Amarillo (excepción justificada), Rojo (prohibido / sancionable).",
          "Plenaria rápida de consensos institucionales."
        ],
        "reflectiveQuestions": [
          "¿Qué alternativas lúdicas y motrices podemos proponer a los estudiantes durante los recreos?",
          "¿Cómo comunicamos este acuerdo a las familias para evitar desacuerdos?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Plenaria y Compromisos para el Código de Convivencia",
        "objective": "Redactar los compromisos institucionales definitivos para su inclusión en la gestión escolar.",
        "materials": [
          "Matriz de compromisos institucionales"
        ],
        "facilitatorScript": "Para que este taller tenga vida, cada área académica firmará 2 compromisos pedagógicos y de supervisión que incorporaremos formalmente a nuestro Código de Convivencia y al Plan de Acción institucional.",
        "activitySteps": [
          "Llenado colectivo de la matriz de compromisos.",
          "Acuerdo sobre la caja o casillero de resguardo opcional en aulas.",
          "Firma simbólica del acta de socialización."
        ],
        "reflectiveQuestions": [
          "¿Cómo modelamos los docentes con nuestro propio ejemplo el uso ético del celular frente a los estudiantes?",
          "¿Qué compromisos pediremos a los padres en la asamblea general de representantes?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "tarjetas-trivia-acuerdo-015a",
        "title": "Tarjetas de Trivia Exprés del Acuerdo Ministerial 015-A",
        "description": "Set de 10 tarjetas recortables con preguntas técnicas, casos de excepción y respuestas normativas oficiales listas para imprimir con líneas de corte (✂️).",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "matriz-compromisos-convivencia-celulares",
        "title": "Matriz de Compromisos Institucionales y Código de Convivencia",
        "description": "Plantilla estructurada en Word para asentar los acuerdos docentes, reglas de excepción y firmas por área académica.",
        "isPrintableCutout": false,
        "icon": "📄"
      }
    ]
  },
  {
    "id": "derechos-ninez-cna-practica",
    "slug": "derechos-ninez-cna-practica",
    "title": "Derechos de la Niñez: del Código a la Práctica en la Comunidad Educativa",
    "subtitle": "Taller vivencial de corresponsabilidad, interés superior y protección integral desde el Código de la Niñez y Adolescencia",
    "category": "prevencion",
    "categoryLabel": "Derechos y Marco Legal de Protección",
    "normativeBase": "Código de la Niñez y Adolescencia (CNA Arts. 1, 6, 11, 12, 37, 50, 73, 74, 79) y Constitución del Ecuador",
    "targetAudiences": [
      "docentes",
      "familias",
      "autoridades",
      "comunidad"
    ],
    "targetAudienceLabel": "Educadores de Primera Infancia (CDI), Docentes, Personal DECE y Familias",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "Protección integral, derechos de niñas, niños y adolescentes y prevención de vulneraciones",
    "generalObjective": "Reconocer y vivenciar los derechos de la niñez consagrados en el Código de la Niñez y Adolescencia, fortaleciendo el rol protector y la corresponsabilidad de educadores y familias.",
    "specificObjectives": [
      "Analizar los principios rectores del CNA: Interés Superior del Niño, Prioridad Absoluta y No Discriminación.",
      "Experimentar vivencialmente las brechas de vulnerabilidad social a través de la dinámica 'La Caminata de los Derechos'.",
      "Consolidar el aprendizaje de los artículos normativos mediante el Bingo de los Derechos de la Niñez."
    ],
    "materialsGeneral": [
      "20 Tarjetas de identidades de la Caminata de los Derechos",
      "Cartillas de Bingo de Derechos de la Niñez (10 cartones)",
      "Carteles en el suelo con derechos fundamentales"
    ],
    "preliminaryNotes": "La dinámica vivencial de la caminata requiere sensibilidad para no estigmatizar, orientando la reflexión hacia la responsabilidad de las instituciones de nivelar las oportunidades.",
    "phases": [
      {
        "durationMinutes": 10,
        "title": "Bienvenida y Activación: 'Una palabra por la niñez protegida'",
        "objective": "Conectar con el sentido ético de la protección infantil.",
        "materials": [
          "Círculo de participantes"
        ],
        "facilitatorScript": "Bienvenidos. En una sola palabra, cada uno exprese qué significa para ustedes una 'niñez protegida'. Conectamos estas voces con el Art. 1 del Código: la protección integral que la ley y nosotros debemos asegurar.",
        "activitySteps": [
          "Ronda de palabras en círculo.",
          "Lectura del facilitador del Art. 1 del Código de la Niñez y Adolescencia."
        ],
        "reflectiveQuestions": [
          "¿En qué medida nuestro entorno cotidiano garantiza esa protección que nombramos?"
        ]
      },
      {
        "durationMinutes": 25,
        "title": "Dinámica Vivencial: Mapa de Derechos Fundamentales",
        "objective": "Ubicar vivencialmente los artículos clave del CNA (igualdad, vida, salud, educación, juego).",
        "materials": [
          "Carteles en el piso: Vida, Salud, Identidad, Educación, Protección, Buen Trato, Juego"
        ],
        "facilitatorScript": "En el suelo vemos los pilares de nuestros niños. Cuando lea una situación o un artículo de la ley, nos moveremos hacia el derecho que se encuentra en juego o en riesgo de ser vulnerado.",
        "activitySteps": [
          "Lectura comentada de los Artículos 6 (No discriminación), 11 (Interés superior) y 12 (Prioridad absoluta).",
          "Desplazamiento físico y justificación de posturas por subgrupos."
        ],
        "reflectiveQuestions": [
          "¿Qué derecho suele ser el primero en sacrificarse cuando hay dificultades económicas en el hogar?"
        ]
      },
      {
        "durationMinutes": 30,
        "title": "Actividad Central: La Caminata de los Derechos (20 Perfiles)",
        "objective": "Evidenciar la desigualdad estructural y el mandato de equidad que exige el CNA.",
        "materials": [
          "20 Tarjetas de identidades de la Caminata de los Derechos"
        ],
        "facilitatorScript": "Cada uno asume la identidad asignada en su tarjeta: niño indígena sin internet, niña afro en zona periurbana, niño con discapacidad, adolescente deportista con beca, etc. No revelen su papel. Leeré afirmaciones de la vida real. Si su personaje puede cumplirla sin dificultad, dé un paso adelante; si no puede o tiene barreras, quédese en su lugar.",
        "activitySteps": [
          "Línea de partida horizontal con todos los participantes alineados.",
          "Lectura de las 10 preguntas de equidad (acceso a salud, libros, recreación segura, escucha familiar).",
          "Observación del mapa final de posiciones distanciadas y reflexión en silencio."
        ],
        "reflectiveQuestions": [
          "¿A los que quedaron atrás: cómo se sintió ver a otros avanzar?",
          "¿A los que llegaron adelante: fueron sus méritos individuales o sus condiciones de partida?",
          "¿Qué debe hacer la escuela y el DECE para acortar esa distancia?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Bingo Didáctico de los Derechos de la Niñez",
        "objective": "Fijar artículos y definiciones normativas a través del juego colaborativo.",
        "materials": [
          "10 Cartillas de bingo recortables y tarjetas de llamado"
        ],
        "facilitatorScript": "Ahora jugamos en mesas de trabajo al Bingo de los Derechos. Cada número corresponde a un artículo del CNA. Quien complete una línea canta el artículo y explica su aplicación práctica en nuestro centro educativo.",
        "activitySteps": [
          "Distribución de cartillas.",
          "Canto de artículos por el facilitador con breve lectura del enunciado legal.",
          "Premiación simbólica del grupo ganador."
        ],
        "reflectiveQuestions": [
          "¿Cuál de estos artículos consideramos que requiere mayor vigilancia en nuestra institución?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Cierre y Decálogo del Cuidador Corresponsable",
        "objective": "Asumir compromisos concretos de garantía de derechos en el aula.",
        "materials": [
          "Pizarra o mural de acuerdos"
        ],
        "facilitatorScript": "Cerramos redactando 5 compromisos indelegables para que ningún niño de nuestra comunidad quede rezagado en la caminata de la vida.",
        "activitySteps": [
          "Construcción colectiva del decálogo.",
          "Firma del acuerdo institucional de protección de derechos."
        ],
        "reflectiveQuestions": [
          "¿Qué haré mañana a primera hora para que un niño que está en riesgo se sienta visto y protegido?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "cartillas-bingo-derechos-ninez",
        "title": "Cartillas y Balotas del Bingo de los Derechos de la Niñez",
        "description": "Documento Word con 10 cartillas de bingo formateadas con líneas punteadas (✂️) y tabla con los 16 artículos del CNA listos para cantar.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "tarjetas-caminata-derechos-cna",
        "title": "20 Tarjetas de Identidades: 'La Caminata de los Derechos'",
        "description": "Set de 20 fichas recortables de perfiles diversos de niñez y adolescencia en Ecuador para ejecutar la dinámica vivencial.",
        "isPrintableCutout": true,
        "icon": "✂️"
      }
    ]
  },
  {
    "id": "rutas-protocolos-acuerdo-081a",
    "slug": "rutas-protocolos-acuerdo-081a",
    "title": "Rutas, Protocolos de Actuación y Acuerdo Ministerial 081-A",
    "subtitle": "Taller vivencial y lúdico para docentes: detección, intervención y derivación obligatoria sin dramatizaciones",
    "category": "prevencion",
    "categoryLabel": "Protocolos de Actuación y Rutas DECE",
    "normativeBase": "Acuerdo Ministerial MINEDUC-MINEDUC-2023-00081-A y Protocolos de Violencia en el Sistema Educativo",
    "targetAudiences": [
      "docentes",
      "tutores",
      "autoridades"
    ],
    "targetAudienceLabel": "Personal Docente, Tutores de Grado, Inspectores y Autoridades Institucionales",
    "estimatedDuration": "120 minutos",
    "relatedActionPlanTopic": "Detección temprana, aplicación de protocolos ante violencia y rutas de derivación ministerial",
    "generalObjective": "Fortalecer la capacidad técnica y procedimental de los docentes para actuar con celeridad, confidencialidad y rigor frente a vulneraciones de derechos y situaciones de violencia, aplicando el Acuerdo 081-A sin errores procesales.",
    "specificObjectives": [
      "Distinguir de forma infalible la secuencia correcta de pasos en la detección, notificación interna y acompañamiento.",
      "Identificar y erradicar las conductas prohibidas para docentes (no revictimizar, no confrontar a agresores, no pedir pruebas, no guardar silencio).",
      "Ejercitar mediante el ensamblaje en tarjetas recortables de 'La Ruta Correcta' para 10 grupos de docentes."
    ],
    "materialsGeneral": [
      "Set de tarjetas/frases recortables 'Ruta Correcta' por grupo",
      "Cartulinas A3 o paneles de armado",
      "Flujograma de bolsillo del Acuerdo 081-A"
    ],
    "preliminaryNotes": "Se evita intencionalmente el sociodrama o dramatizaciones de agresiones para proteger a posibles víctimas no declaradas entre los participantes y evitar la banalización de la violencia.",
    "phases": [
      {
        "durationMinutes": 10,
        "title": "Bienvenida y Organización en 10 Equipos de Guardianes",
        "objective": "Organizar los equipos de trabajo y encuadrar el Acuerdo 081-A.",
        "materials": [
          "Listado de 10 grupos"
        ],
        "facilitatorScript": "Compañeros: el Acuerdo 081-A no es un trámite burocrático, es el escudo legal e institucional que protege la vida de nuestros estudiantes y nos respalda como profesionales. Hoy no vamos a dar charlas magistrales; vamos a trabajar en 10 mesas técnicas operativas.",
        "activitySteps": [
          "Conformación de 10 grupos de 4 a 7 docentes.",
          "Asignación de temática por mesa: Violencia Sexual, Violencia Física, Acoso Escolar, Violencia Digital, Drogas, Suicidio, Desaparición, Trabajo Infantil, Embarazo, Trata."
        ],
        "reflectiveQuestions": [
          "¿Por qué el tiempo de notificación inmediata (máximo 24 o 48 horas según el caso) es vital para salvar a una víctima?"
        ]
      },
      {
        "durationMinutes": 30,
        "title": "Actividad 1 – 'La Ruta Correcta': Ensamblaje de Frases Recortables",
        "objective": "Identificar y clasificar acciones correctas, condicionadas e incorrectas en el protocolo.",
        "materials": [
          "Set de frases recortables por grupo (correctas en verde, condicionadas en amarillo, incorrectas en rojo)"
        ],
        "facilitatorScript": "Cada mesa recibe un paquete de fichas recortadas desordenadas. Contiene acciones que un docente DEBE hacer, acciones PROHIBIDAS y acciones CONDICIONADAS a la autorización de la víctima o del DECE. Su misión es construir en su cartelera la secuencia temporal correcta de la ruta.",
        "activitySteps": [
          "Trabajo en grupo clasificando las tarjetas.",
          "Ensamblaje del flujograma secuencial en cartulina A3.",
          "Rotulación con semáforo de colores de las decisiones críticas."
        ],
        "reflectiveQuestions": [
          "¿Por qué interrogar a un niño sobre los detalles de un presunto abuso sexual constituye revictimización punible?"
        ]
      },
      {
        "durationMinutes": 40,
        "title": "Actividad 2 – Dilemas de Aula y Micro-Casos Complejos",
        "objective": "Resolver encrucijadas prácticas que suelen paralizar al docente en la cotidianidad escolar.",
        "materials": [
          "Fichas de dilemas: secreto confesado, agresión intrafamiliar, ciberacoso entre pares"
        ],
        "facilitatorScript": "Un estudiante se acerca al recreo y les dice: 'Profe, le voy a contar algo muy grave pero júreme por su madre que no le dirá a nadie, ni al DECE ni a mis papás'. ¿Qué responden exactamente en los primeros 30 segundos?",
        "activitySteps": [
          "Resolución del dilema de confidencialidad en cada mesa.",
          "Formulación del diálogo exacto del docente: contención cálida sin falsas promesas de secreto.",
          "Revisión de la obligación legal de denunciar ante Fiscalía / Junta Cantonal según el Art. 73 LOEI."
        ],
        "reflectiveQuestions": [
          "¿Cómo explicar al estudiante que buscar ayuda especializada en el DECE no es traicionar su confianza sino protegerlo?"
        ]
      },
      {
        "durationMinutes": 25,
        "title": "Galería Silenciosa y Micro-Pitches de Validación",
        "objective": "Socializar y retroalimentar colectivamente las 10 rutas producidas.",
        "materials": [
          "Carteleras fijadas en las paredes"
        ],
        "facilitatorScript": "Haremos una galería silenciosa de 5 minutos. Caminamos por el salón observando las carteleras de los otros 9 grupos. Colocamos un visto en las rutas bien blindadas y una alerta si encontramos un error procesal. Luego escuchamos 5 micro-pitches de 45 segundos.",
        "activitySteps": [
          "Recorrido de galería con marcadores.",
          "Exposición relámpago de 5 grupos seleccionados.",
          "Corrección técnica precisa por parte del equipo DECE."
        ],
        "reflectiveQuestions": [
          "¿Qué errores comunes detectamos que solíamos cometer por falta de claridad en el acuerdo?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Cierre, Entrega del Flujograma de Bolsillo y Compromisos",
        "objective": "Consolidar la red de protección interna entre docentes y el departamento de consejería.",
        "materials": [
          "Flujograma de Bolsillo del Acuerdo 081-A"
        ],
        "facilitatorScript": "Terminamos entregando a cada docente la guía de bolsillo con los números directos del DECE, ECU-911 y Fiscalía. Recuerden: el docente detecta y acompaña; no investiga, no juzga y nunca se queda solo con el caso.",
        "activitySteps": [
          "Distribución de la guía de bolsillo.",
          "Firma del acta de compromiso institucional."
        ],
        "reflectiveQuestions": [
          "¿A quién acudir de inmediato en la institución si el directivo o autoridad no está presente en el momento del hecho?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "set-frases-recortables-ruta-correcta",
        "title": "Set de Frases Recortables: 'La Ruta Correcta' (Acuerdo 081-A)",
        "description": "Colección de tarjetas para recortar (✂️) con acciones procedimentales correctas, prohibiciones expresas y excepciones de actuación para 10 subgrupos de docentes.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "flujograma-bolsillo-rutas-081a",
        "title": "Flujograma de Bolsillo: Rutas y Protocolos de Actuación Docente",
        "description": "Tríptico resumen en Word con los pasos inmediatos ante presunción de violencia, números de emergencia y plazos legales del Acuerdo 081-A.",
        "isPrintableCutout": false,
        "icon": "📄"
      }
    ]
  },
  {
    "id": "descarga-dece-terapia-contextual",
    "slug": "descarga-dece-terapia-contextual",
    "title": "Descarga Emocional y Autocuidado para Profesionales DECE",
    "subtitle": "Abordaje vivencial desde la Terapia de Aceptación y Compromiso (ACT) frente al desgaste moral, la sobrecarga y el burnout",
    "category": "socioemocional",
    "categoryLabel": "Cuidado al Cuidador y Salud Mental DECE",
    "normativeBase": "Modelo de Funcionamiento de los DECE - Eje de Prevención del Burnout y Contención de Equipos Técnicos",
    "targetAudiences": [
      "autoridades",
      "comunidad"
    ],
    "targetAudienceLabel": "Profesionales de Consejería Estudiantil (DECE), Psicólogos Clínicos, Educativos y Trabajadores Sociales",
    "estimatedDuration": "100 minutos",
    "relatedActionPlanTopic": "Salud mental ocupacional, cuidado al cuidador y prevención del desgaste empático",
    "generalObjective": "Proporcionar a los equipos DECE un espacio seguro de descarga emocional profunda mediante técnicas de Terapia Contextual (ACT), permitiendo procesar el desgaste moral y reactivar valores profesionales auténticos.",
    "specificObjectives": [
      "Desmantelar el mito del 'profesional DECE invulnerable' mediante la dinámica de confrontación 'El Juicio Invisible'.",
      "Reconocer y diferenciar el dolor limpio del sufrimiento derivado de la trampa del control sobre variables externas del sistema.",
      "Ejercitar defusión cognitiva y anclaje en valores personales para sostener la práctica profesional sin quebrar la salud mental."
    ],
    "materialsGeneral": [
      "Silla central para la dinámica del tribunal invisible",
      "Ficha de análisis de desgaste moral",
      "Tarjetas de ancla de valores y defusión cognitiva"
    ],
    "preliminaryNotes": "Este taller es exclusivo para profesionales del DECE. No deben participar directivos ni evaluadores jerárquicos para garantizar una catarsis honesta y segura.",
    "phases": [
      {
        "durationMinutes": 20,
        "title": "Dinámica de Confrontación: 'El Juicio Invisible y el DECE Ideal'",
        "objective": "Hacer visible la carga asfixiante de expectativas no reciprocadas que sufre el profesional.",
        "materials": [
          "Una silla en el centro de la sala"
        ],
        "facilitatorScript": "Colocamos una silla en el centro. Aquí se va a sentar simbólicamente 'el DECE ideal'. Invito a un colega voluntario a sentarse. El resto, de pie alrededor, va a verbalizar una a una las exigencias silenciosas o explícitas que el sistema nos arroja a diario: 'Debes resolverlo todo', 'Tú no puedes quebrarte', 'No denuncies para no perjudicar la imagen del colegio', 'Contén a todos los docentes'.",
        "activitySteps": [
          "Voluntario al centro.",
          "Bombardeo pausado de frases reales por parte de los pares.",
          "Detención a los 3 minutos y chequeo somático: ¿Qué sintió tu pecho, tus hombros, tu respiración?",
          "Intervención del facilitador: El burnout no inicia por exceso de trabajo, sino por exceso de expectativa sin reciprocidad."
        ],
        "reflectiveQuestions": [
          "¿Cuántas de estas exigencias absurdas las hemos interiorizado como si fueran nuestra culpa individual?"
        ]
      },
      {
        "durationMinutes": 25,
        "title": "La Trampa del Control y la Mochila de Piedras del Sistema",
        "objective": "Diferenciar las áreas de influencia directa frente a las fallas estructurales del sistema judicial y social.",
        "materials": [
          "Ficha de deslinde de responsabilidades sistémicas"
        ],
        "facilitatorScript": "Cuando una fiscalía archiva un caso o una familia no asiste a la citación, sentimos que fallamos. Eso se llama 'desgaste moral': saber qué es lo éticamente correcto pero encontrarse con un muro institucional. Hoy vamos a sacar de nuestra mochila las piedras que no nos pertenecen cargar.",
        "activitySteps": [
          "Identificación individual de las 3 piedras más pesadas que cargamos este mes.",
          "Clasificación en la matriz: ¿Está bajo mi control directo o es limitación del sistema?",
          "Acto simbólico de desprendimiento del resultado final."
        ],
        "reflectiveQuestions": [
          "¿Puedo ser un profesional compasivo y eficiente sin asumir el destino de toda una comunidad sobre mis espaldas?"
        ]
      },
      {
        "durationMinutes": 30,
        "title": "Defusión Cognitiva y el Ancla de Valores (ACT)",
        "objective": "Aprender a observar los pensamientos de incompetencia sin fusionarse con ellos.",
        "materials": [
          "Tarjetas de defusión cognitiva y anclaje"
        ],
        "facilitatorScript": "Cuando tu mente te diga: 'No sirves para esto, no hiciste lo suficiente', no intentes pelear con ella. Aplica la defusión: 'Noto que estoy teniendo el pensamiento de que no hice lo suficiente'. El pensamiento es solo un evento mental, no una verdad absoluta. Ahora, conéctate con tu ancla de valor: ¿Por qué elegiste esta profesión?",
        "activitySteps": [
          "Práctica guiada en parejas de defusión lingüística.",
          "Identificación del valor cardinal que sostiene la vocación de cada participante.",
          "Ejercicio de respiración con contacto en el pecho (autocompasión)."
        ],
        "reflectiveQuestions": [
          "Si no tuvieras que demostrarle nada a nadie, ¿cómo acompañarías mañana a tus estudiantes desde la paz?"
        ]
      },
      {
        "durationMinutes": 25,
        "title": "Pacto de Apoyo Inter-DECE y Plan de Autocuidado Radical",
        "objective": "Establecer una red viva de cuidado mutuo entre colegas.",
        "materials": [
          "Ficha de compromisos de autocuidado"
        ],
        "facilitatorScript": "El autocuidado no es prender una vela aromática los domingos. Es poner límites claros, apagar el teléfono del trabajo fuera de horario y tener al menos un colega a quien llamar para desahogarse sin ser juzgado.",
        "activitySteps": [
          "Asignación de 'parejas de apoyo DECE' para monitoreo emocional quincenal.",
          "Firma del pacto de desconexión y protección del descanso.",
          "Cierre con abrazo colectivo de contención."
        ],
        "reflectiveQuestions": [
          "¿Qué límite no negociable pondré esta misma semana en mi lugar de trabajo para cuidar mi salud?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "ficha-desgaste-moral-juicio-invisible",
        "title": "Ficha de Análisis del Desgaste Moral y Matriz de Control",
        "description": "Instrumento reflexivo en Word para deslindar la responsabilidad profesional de las fallas del sistema judicial y escolar.",
        "isPrintableCutout": false,
        "icon": "📄"
      },
      {
        "id": "tarjetas-defusion-ancla-valores-act",
        "title": "Tarjetas Recortables de Defusión Cognitiva y Valores (ACT)",
        "description": "Set de 8 fichas recortables de bolsillo (✂️) con ejercicios de distanciamiento cognitivo, respiración compasiva y anclaje vocacional para terapeutas.",
        "isPrintableCutout": true,
        "icon": "✂️"
      }
    ]
  },
  {
    "id": "embarazo-jugar-pensar-decidir",
    "slug": "embarazo-jugar-pensar-decidir",
    "title": "Prevención del Embarazo en Adolescentes: 'Jugar, Pensar y Decidir'",
    "subtitle": "Taller lúdico-reflexivo sobre afectividad, límites, presión de pares y construcción del proyecto de vida",
    "category": "prevencion",
    "categoryLabel": "Educación Integral de la Sexualidad (EIS)",
    "normativeBase": "Política Intersectorial de Prevención del Embarazo en Niñas y Adolescentes (PIPENA) y LOEI",
    "targetAudiences": [
      "estudiantes"
    ],
    "targetAudienceLabel": "Estudiantes de Básica Superior (12 a 15 años)",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "Prevención del embarazo adolescente, salud sexual y afectiva y proyecto de vida",
    "generalObjective": "Propiciar un espacio lúdico y reflexivo para que los adolescentes identifiquen mitos en torno al enamoramiento y la sexualidad, fortaleciendo su asertividad para tomar decisiones libres e informadas.",
    "specificObjectives": [
      "Cuestionar creencias erróneas sobre el amor romántico que justifican el sometimiento y la presión sexual.",
      "Ejercitar la capacidad de decir 'NO' ante la presión de la pareja o de pares mediante dilemas vivenciales.",
      "Visibilizar cómo un embarazo a temprana edad transforma y posterga las metas individuales del proyecto de vida."
    ],
    "materialsGeneral": [
      "Pelota liviana para la dinámica 'El quemado de las ideas'",
      "Tarjetas de dilemas del laberinto de decisiones",
      "Fichas de proyecto de vida"
    ],
    "preliminaryNotes": "Mantener un tono pedagógico, cercano y no juzgador. No moralizar ni recurrir al miedo, sino a la autonomía y al autocuidado.",
    "phases": [
      {
        "durationMinutes": 15,
        "title": "Apertura: 'El Quemado de las Ideas y Mitos del Amor'",
        "objective": "Activar la participación y sondear mitos afectivos cotidianos.",
        "materials": [
          "Pelota plástica"
        ],
        "facilitatorScript": "¡Hola a todos! Hoy no venimos a dar una clase aburrida. Usaremos una pelota para jugar a 'El quemado de las ideas'. Quien reciba la pelota debe decir si está de acuerdo o en desacuerdo con la frase y por qué. Primera frase: 'Cuando uno se enamora, deja de pensar con claridad'.",
        "activitySteps": [
          "Lanzamiento de pelota y respuestas rápidas.",
          "Frases clave: 'Si me quiere, debe respetar mis decisiones', 'Decir NO también es cuidarse', 'El amor no debería doler'.",
          "Intervención facilitadora sintetizando que el respeto es el cimiento de cualquier relación sana."
        ],
        "reflectiveQuestions": [
          "¿Por qué a veces nos cuesta decir que no cuando la persona que nos gusta nos presiona?"
        ]
      },
      {
        "durationMinutes": 30,
        "title": "Actividad 2 – 'El Laberinto de las Decisiones Cotidianas'",
        "objective": "Experimentar en subgrupos cómo una sola decisión impulsiva o desinformada cambia las rutas futuras.",
        "materials": [
          "Tarjetas de situaciones y encrucijadas"
        ],
        "facilitatorScript": "Nos dividimos en 5 grupos. Cada equipo tiene una historia con varias bifurcaciones: Camila y Mateo están en una fiesta, hay licor, sus amigos los presionan... Cada grupo debe elegir qué camino toma su personaje y leer la consecuencia correspondiente.",
        "activitySteps": [
          "Lectura del caso y discusión en subgrupos de 10 minutos.",
          "Elección del camino A, B o C.",
          "Lectura de los desenlaces: impacto en salud, emociones, familia y estudios."
        ],
        "reflectiveQuestions": [
          "¿Qué factores influyen más para que un adolescente actúe en contra de lo que realmente desea?"
        ]
      },
      {
        "durationMinutes": 30,
        "title": "Dilemas y Cartas de Consecuencias a Futuro",
        "objective": "Analizar el impacto real de la paternidad y maternidad a los 13 o 14 años.",
        "materials": [
          "Cartas de consecuencias recortables"
        ],
        "facilitatorScript": "Tener un hijo es una de las responsabilidades más grandes de la vida humana. A los 14 años, ¿qué pasa con el colegio, con las salidas con amigos, con la economía personal? Analicemos los testimonios reales de nuestra ficha.",
        "activitySteps": [
          "Análisis de cartas de testimonios juveniles.",
          "Cálculo práctico de los costos económicos y de tiempo que demanda el cuidado de un recién nacido.",
          "Puesta en común de reflexiones."
        ],
        "reflectiveQuestions": [
          "¿Por qué la responsabilidad del cuidado no debe recaer únicamente sobre la mujer?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Plenaria: 'Cuidarme también es quererme' y Cierre",
        "objective": "Reforzar los factores protectores y la red de ayuda institucional.",
        "materials": [
          "Ficha de compromisos personales"
        ],
        "facilitatorScript": "Terminamos con un compromiso con nosotros mismos: tu cuerpo es tuyo, tu futuro es tuyo y nadie tiene derecho a apresurar tus etapas. En el DECE siempre hay una puerta abierta para hablar de esto con total confidencialidad.",
        "activitySteps": [
          "Llenado de la ficha de metas a 5 años.",
          "Compromiso grupal de apoyo mutuo y respeto.",
          "Entrega de contactos del DECE y centro de salud."
        ],
        "reflectiveQuestions": [
          "¿Cuál es mi sueño más grande para los próximos años y cómo lo protegeré?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "tarjetas-dilemas-laberinto-decisiones",
        "title": "Tarjetas de Dilemas y Consecuencias: 'El Laberinto de las Decisiones'",
        "description": "Set de 8 casos con encrucijadas cotidianas de pareja y consecuencias delimitadas con líneas de corte (✂️) para trabajo grupal en aula.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "ficha-quemado-ideas-mitos-enamoramiento",
        "title": "Ficha Didáctica: 'El Quemado de las Ideas' y Mitos del Enamoramiento",
        "description": "Guía de debate con 12 afirmaciones problematizadoras y conceptos clave de educación integral de la sexualidad.",
        "isPrintableCutout": false,
        "icon": "📄"
      }
    ]
  },
  {
    "id": "embarazo-decisiones-proyecto-vida",
    "slug": "embarazo-decisiones-proyecto-vida",
    "title": "Sexualidad Responsable: 'Lo que decido hoy, impacta mi mañana'",
    "subtitle": "Prevención del embarazo no planificado, mitos de género y proyecto de vida en estudiantes de bachillerato",
    "category": "prevencion",
    "categoryLabel": "Salud Sexual y Reproductiva",
    "normativeBase": "Estrategia Nacional de Salud Sexual y Reproductiva, Código de la Niñez y LOEI",
    "targetAudiences": [
      "estudiantes"
    ],
    "targetAudienceLabel": "Estudiantes de 1ro, 2do y 3ro de Bachillerato (15 a 18 años)",
    "estimatedDuration": "90 minutos",
    "relatedActionPlanTopic": "Salud sexual y reproductiva, prevención de ITS/embarazo y proyecto de vida en jóvenes",
    "generalObjective": "Promover procesos de reflexión crítica sobre enamoramiento, consentimiento, métodos de prevención, paternidad/maternidad responsable y rutas de salud pública a través del juego interactivo.",
    "specificObjectives": [
      "Aclarar mitos y realidades sobre la fertilidad, métodos anticonceptivos y doble protección (ITS + embarazo).",
      "Vivenciar la toma de decisiones informadas mediante el Bingo de la Sexualidad Responsable con íconos.",
      "Conocer las rutas institucionales de acceso a salud pública sin barreras de edad ni discriminación."
    ],
    "materialsGeneral": [
      "Cartones del Bingo de la Sexualidad Responsable (40 cartones con íconos)",
      "Bolsa con fichas de íconos pedagógicos",
      "Ficha de metas y proyecto de vida"
    ],
    "preliminaryNotes": "La actividad del bingo utiliza íconos visuales (condón, pastillas, implante, DIU, respeto, comunicación, consentimiento, proyecto de vida) para facilitar el diálogo técnico sin tabúes.",
    "phases": [
      {
        "durationMinutes": 15,
        "title": "Rompehielos Reflexivo: 'Verdadero o Falso – Me muevo o me quedo'",
        "objective": "Explorar creencias y mitos arraigados en el grupo sobre sexualidad.",
        "materials": [
          "Espacio despejado en el aula"
        ],
        "facilitatorScript": "Nos ponemos de pie. Leeré varias afirmaciones. Si creen que es Verdadera, levantan la mano; si creen que es Falsa, se cruzan de brazos. Primera: 'La primera vez una mujer no puede quedar embarazada'. Segunda: 'Si dos personas se quieren, no hace falta hablar de métodos anticonceptivos'.",
        "activitySteps": [
          "Lectura ágil de 8 afirmaciones mito vs. realidad.",
          "Aclaración científica breve por parte del facilitador sin emitir juicios de valor.",
          "Retorno a los asientos con clima de confianza generado."
        ],
        "reflectiveQuestions": [
          "¿Por qué siguen circulando mitos falsos sobre la fertilidad a pesar de tener internet en el bolsillo?"
        ]
      },
      {
        "durationMinutes": 35,
        "title": "Actividad Central: Bingo de la Sexualidad Responsable con Íconos",
        "objective": "Integrar conceptos de salud, derechos y prevención mediante 40 cartones lúdicos.",
        "materials": [
          "40 Cartones de bingo con íconos y leyenda explicativa"
        ],
        "facilitatorScript": "Cada uno tiene un cartón único de bingo. No hay números: hay íconos que representan derechos, métodos, actitudes y redes de apoyo: Condón, Implante, DIU, Respeto, Consentimiento, Proyecto de Vida, Atención en Salud, etc. Cuando saque un ícono, daré una pista conceptual. El primero en llenar su cartón o línea grita: ¡DECISIÓN RESPONSABLE!",
        "activitySteps": [
          "Reparto de los 40 cartones numerados.",
          "Canto de los íconos por el facilitador explicando su función pedagógica y preventiva.",
          "Validación pública de los cartones premiados."
        ],
        "reflectiveQuestions": [
          "¿Qué significa en la práctica el comodín de la 'Decisión Responsable'?"
        ]
      },
      {
        "durationMinutes": 25,
        "title": "Análisis de Rutas de Salud Integral y Derechos Juveniles",
        "objective": "Informar con precisión los servicios gratuitos y confidenciales del Centro de Salud del MSP.",
        "materials": [
          "Infografía de servicios amigables para adolescentes"
        ],
        "facilitatorScript": "Muchos jóvenes no acuden a informarse por temor a que le avisen a sus padres o los regañen. El Ministerio de Salud tiene los 'Espacios Amigables para Adolescentes' donde la atención es gratuita, confidencial y sin necesidad de acompañamiento adulto para asesoría anticonceptiva.",
        "activitySteps": [
          "Presentación del mapa de salud local y ubicación del centro de salud más cercano.",
          "Explicación del derecho a la salud sexual garantizado en la Constitución.",
          "Preguntas y respuestas anónimas mediante buzón de dudas."
        ],
        "reflectiveQuestions": [
          "¿Qué temores nos impiden pedir orientación profesional a tiempo?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Compromisos con mi Proyecto de Vida y Cierre",
        "objective": "Conectar las decisiones del presente con la realización de metas futuras.",
        "materials": [
          "Ficha personal de proyecto de vida"
        ],
        "facilitatorScript": "Terminamos recordando: 'Lo que decido hoy, impacta mi mañana'. Tu proyecto de vida no es negociable. Cuidarte es el acto más maduro y valiente que puedes hacer por ti y por quienes te rodean.",
        "activitySteps": [
          "Firma personal de la ficha de metas.",
          "Entrega de tarjeta de bolsillo con los canales de apoyo del DECE y salud."
        ],
        "reflectiveQuestions": [
          "¿Quién es la persona de mayor confianza a quien acudiría si enfrento una duda o problema de salud?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "bingo-sexualidad-responsable-iconos",
        "title": "Cartones del Bingo de la Sexualidad Responsable con Íconos",
        "description": "Set de cartones listos para imprimir y recortar (✂️) con matriz de íconos pedagógicos y leyenda oficial para el facilitador.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "ficha-proyecto-vida-decision-responsable",
        "title": "Ficha de Compromisos Personales: 'Lo que decido hoy, impacta mi mañana'",
        "description": "Formato Word de autoevaluación, desmitificación de la sexualidad y diseño de metas académicas y vocacionales a mediano plazo.",
        "isPrintableCutout": false,
        "icon": "📄"
      }
    ]
  },
  {
    "id": "masculinidades-de-hombre-a-hombre",
    "slug": "masculinidades-de-hombre-a-hombre",
    "title": "Taller Vivencial para Varones: 'De Hombre a Hombre: Lo que nadie te cuenta'",
    "subtitle": "Paternidad responsable, deconstrucción de mandatos machistas y autocuidado en la adolescencia",
    "category": "prevencion",
    "categoryLabel": "Nuevas Masculinidades y Prevención de Paternidad",
    "normativeBase": "LOEI Enfoque de Género, Derechos Humanos y Prevención de Violencias",
    "targetAudiences": [
      "estudiantes"
    ],
    "targetAudienceLabel": "Estudiantes varones de Básica Superior y Bachillerato (13 a 17 años)",
    "estimatedDuration": "80 minutos",
    "relatedActionPlanTopic": "Prevención de la paternidad temprana, nuevas masculinidades y desmitificación de roles",
    "generalObjective": "Abrir un espacio de diálogo horizontal entre varones para comprender la sexualidad masculina desde lo corporal, emocional y social, cuestionando mandatos de riesgo y promoviendo la paternidad responsable.",
    "specificObjectives": [
      "Desarmar la creencia de que ser hombre radica en demostrar experiencia sexual desprotegida o asumir conductas temerarias.",
      "Abordar sin tabúes la anatomía, las dudas corporales y las emociones que los varones suelen reprimir.",
      "Analizar la realidad de la paternidad adolescente desde los roles paternos no asumidos y el impacto en sus proyectos personales."
    ],
    "materialsGeneral": [
      "Tarjetas desafío de mitos masculinos",
      "Espacio amplio en patio o coliseo",
      "Pacto de compromiso 'Cuido mi cuerpo'"
    ],
    "preliminaryNotes": "El taller debe ser facilitado preferentemente por un profesional varón del DECE o con entrenamiento en enfoque de masculinidades no hegemónicas para propiciar empatía y horizontalidad.",
    "phases": [
      {
        "durationMinutes": 15,
        "title": "Inicio sin filtros: 'Entre panas, lo que nadie te cuenta'",
        "objective": "Romper el hielo desde la cercanía y desarmar la pose de 'sabelotodo'.",
        "materials": [
          "Círculo de confianza"
        ],
        "facilitatorScript": "Esto no es una clase formal. Es una charla entre hombres para hablar de lo que nadie explica pero todos viven: los cambios raros del cuerpo, la presión por aparentar que ya sabemos todo de sexo, el miedo a quedar en ridículo. Aquí no juzgamos a nadie, hablamos claro y con respeto.",
        "activitySteps": [
          "Preguntas rápidas al aire: ¿Quién ha escuchado mitos raros sobre su cuerpo? ¿Quién cree que un embarazo no cambia la vida del varón?",
          "Normalización de la incertidumbre y apertura de la escucha entre pares."
        ],
        "reflectiveQuestions": [
          "¿Por qué los hombres sentimos la necesidad de presumir cosas que a veces ni nosotros entendemos?"
        ]
      },
      {
        "durationMinutes": 25,
        "title": "Desmitificando el cuerpo y las hormonas: 'Ser hombre de verdad'",
        "objective": "Informar sobre cambios fisiológicos, erecciones espontáneas, poluciones y manejo del impulso.",
        "materials": [
          "Tarjetas de mitos y realidades anatómicas"
        ],
        "facilitatorScript": "Ser hombre de verdad no es el que se acuesta con más personas ni el que busca pleitos. Es el que tiene el coraje de pensar antes de actuar, el que respeta cuando una chica dice no y el que sabe que su cuerpo no es un arma ni un trofeo.",
        "activitySteps": [
          "Revisión de tarjetas con preguntas anónimas sobre poluciones nocturnas, tamaño, pornografía y masturbación.",
          "Diferenciación entre el deseo natural y la adicción al consumo digital irreal.",
          "Énfasis en el consentimiento absoluto en cualquier interacción."
        ],
        "reflectiveQuestions": [
          "¿Cómo distorsiona la pornografía la realidad de las relaciones humanas y el respeto al cuerpo ajeno?"
        ]
      },
      {
        "durationMinutes": 25,
        "title": "Simulación de Paternidad Temprana: Los costos que no te dicen",
        "objective": "Evidenciar que el embarazo no es un 'problema de mujeres' sino una responsabilidad ética y legal del varón.",
        "materials": [
          "Ficha de cálculo de presupuesto y responsabilidades legales"
        ],
        "facilitatorScript": "Muchos piensan: 'Si ella queda embarazada, es su problema, yo sigo estudiando'. Falso. La ley ecuatoriana exige pensión alimenticia obligatoria, visitas y reconocimiento paterno. Pero más allá de la ley: ¿cómo te sentirías sabiendo que un hijo tuyo crece sin tu presencia o en precariedad?",
        "activitySteps": [
          "Dinámica del presupuesto: ¿Cuánto cuesta un paquete de pañales, la leche, la consulta pediátrica?",
          "Comparación con los ingresos de un adolescente sin título de bachiller.",
          "Reflexión sobre los padres ausentes y el impacto en la propia historia familiar."
        ],
        "reflectiveQuestions": [
          "¿Qué tipo de padre quiero ser en el futuro cuando tenga la madurez y los recursos para serlo?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Pacto de Respeto, Consentimiento y Autocuidado",
        "objective": "Firmar el compromiso de honor consigo mismo y con su comunidad.",
        "materials": [
          "Pacto personal 'Cuido mi cuerpo y construyo mis sueños'"
        ],
        "facilitatorScript": "Cerramos este círculo con un pacto de caballeros: yo cuido mi cuerpo, yo no presiono a nadie, yo uso protección siempre y no pongo en juego mis metas por un minuto de imprudencia.",
        "activitySteps": [
          "Lectura comunitaria del pacto.",
          "Firma personal para conservar en la billetera o cuaderno.",
          "Cierre con choque de puños en señal de camaradería y respeto."
        ],
        "reflectiveQuestions": [
          "¿A qué amigo le compartiré hoy lo que aprendí para evitar que cometa un error?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "tarjetas-desafio-mitos-sexualidad-masculina",
        "title": "Tarjetas Recortables: Mitos y Desafíos de la Sexualidad Masculina",
        "description": "Set de 8 fichas recortables (✂️) con preguntas difíciles, desmontaje de mitos machistas y datos científicos sobre el desarrollo adolescente.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "pacto-personal-cuido-mi-cuerpo",
        "title": "Pacto de Honor: 'Cuido mi cuerpo y construyo mis sueños'",
        "description": "Ficha personal con compromisos de consentimiento, uso de preservativo, prevención de paternidad temprana y metas a futuro.",
        "isPrintableCutout": false,
        "icon": "📄"
      }
    ]
  },
  {
    "id": "sensibilizacion-tea-padres",
    "slug": "sensibilizacion-tea-padres",
    "title": "Sensibilización para Familias: 'Antes de juzgar: Lo que no vemos de un niño diferente'",
    "subtitle": "Comprensión del Trastorno del Espectro Autista (TEA Grado 3), desbordamiento sensorial y empatía en la comunidad escolar",
    "category": "inclusion",
    "categoryLabel": "Educación Inclusiva y Familias",
    "normativeBase": "LOEI Art. 47 (Educación Inclusiva) y Normativa de Necesidades Educativas Específicas (NEE)",
    "targetAudiences": [
      "familias",
      "docentes",
      "comunidad"
    ],
    "targetAudienceLabel": "Madres, Padres de Familia y Representantes de Educación Básica y Docentes",
    "estimatedDuration": "75 minutos",
    "relatedActionPlanTopic": "Inclusión escolar de estudiantes con TEA, empatía familiar y convivencia libre de discriminación",
    "generalObjective": "Sensibilizar a los padres de familia sobre la realidad neurodivergente del TEA Grado 3, transformando prejuicios de mala crianza o agresión deliberada en comprensión del desbordamiento sensorial y compromiso comunitario.",
    "specificObjectives": [
      "Identificar el prejuicio inicial no expresado mediante la herramienta 'El Espejo Roto'.",
      "Experimentar vivencialmente a través de estaciones sensoriales la saturación auditiva, táctil y la frustración comunicativa.",
      "Construir un símbolo físico de inclusión mediante la elaboración de la grulla de origami de la empatía."
    ],
    "materialsGeneral": [
      "Hojas del ejercicio 'El Espejo Roto'",
      "Estación sensorial: audios de ruidos intensos, lija de agua suave, luces",
      "Hojas cuadradas de colores para origami de grullas"
    ],
    "preliminaryNotes": "No se debe mencionar el nombre del estudiante con TEA en el taller. Se trabaja desde el perfil universal de inclusión para evitar señalamientos y proteger la intimidad del menor.",
    "phases": [
      {
        "durationMinutes": 10,
        "title": "Apertura: 'El Espejo Roto' (Captura del Prejuicio Inicial)",
        "objective": "Hacer visible con honestidad el juicio instintivo que surge ante conductas atípicas.",
        "materials": [
          "Hojas individuales en cada asiento"
        ],
        "facilitatorScript": "Al sentarse han encontrado una hoja con una frase incompleta. Les pido que escriban con total sinceridad lo primero que sienten sin filtros: 'Cuando veo en el aula a un niño que grita, golpea o se desborda, yo pienso que...'. Nadie va a leer su hoja en voz alta ahora. Dóblenla y guárdenla en su bolsillo. Volveremos a ella al final.",
        "activitySteps": [
          "Escritura silenciosa individual.",
          "Guarda de la hoja en el bolsillo.",
          "Encuadre clínico del facilitador: ¿Qué es el TEA Grado 3? El lenguaje del desbordamiento frente a la falta de comunicación verbal."
        ],
        "reflectiveQuestions": [
          "¿Por qué solemos juzgar a los padres de un niño antes de preguntar qué está atravesando esa familia?"
        ]
      },
      {
        "durationMinutes": 25,
        "title": "Estaciones Vivenciales: 'Vive lo que él vive'",
        "objective": "Sentir en el propio cuerpo la sobrecarga sensorial y la impotencia comunicativa.",
        "materials": [
          "Estación 1: ruido estridente de fondo, lija áspera en mesa. Estación 2: comunicación sin palabras en parejas"
        ],
        "facilitatorScript": "Nos dividiremos en dos estaciones. En la Estación 1 deben resolver un crucigrama sencillo mientras escuchan ruido desordenado al volumen máximo y tocan una superficie áspera sin poder apartar la mano. En la Estación 2, uno intentará pedirle a su pareja ayuda urgente usando solo sonidos guturales, sin palabras ni señas convencionales. Tras esto, guardaremos 3 minutos de silencio total.",
        "activitySteps": [
          "Rotación de 10 minutos por estación.",
          "Vivencia de sobrecarga sensorial e imposibilidad de hacerse entender.",
          "Silencio contenedor de 3 minutos guiado por el facilitador."
        ],
        "reflectiveQuestions": [
          "¿Sintieron ganas de gritar, empujar o salir corriendo de la sala durante el ejercicio?"
        ]
      },
      {
        "durationMinutes": 20,
        "title": "Lo que el cuerpo ya sabe: Deconstrucción del Juicio",
        "objective": "Vincular las sensaciones vividas con las crisis de los estudiantes con autismo en aula.",
        "materials": [
          "Pizarra de sensaciones"
        ],
        "facilitatorScript": "Esa desesperación que sintieron en solo 10 minutos es la realidad cotidiana del niño con TEA Grado 3 cuando el aula tiene ruido excesivo o se rompe su rutina. No golpea por maldad, golpea porque su sistema nervioso colapsó y no tiene palabras para decir: 'Ayúdenme, me duele todo'.",
        "activitySteps": [
          "Plenaria guiada: cómo educar a nuestros propios hijos para que no se burlen ni excluyan.",
          "El rol de los padres como modelos de empatía frente a sus hijos.",
          "Desmitificación: la inclusión no perjudica el aprendizaje de los demás, les enseña humanidad real."
        ],
        "reflectiveQuestions": [
          "¿Cómo cambia mi mirada hacia la madre que recoge a su hijo en medio de una crisis en la puerta de la escuela?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Dinámica Manual: La Grulla de Origami de la Empatía",
        "objective": "Materializar la paciencia y el cuidado a través del doblado de papel en comunidad.",
        "materials": [
          "Papel cuadrado de colores y guía paso a paso ilustrada"
        ],
        "facilitatorScript": "En la tradición japonesa, doblar una grulla de papel representa un voto de paz y paciencia. Un niño con autismo requiere que doblemos nuestras expectativas con la misma paciencia que requiere cada pliegue de esta grulla. La doblaremos juntos y cada uno se la llevará a su casa.",
        "activitySteps": [
          "Doblado guiado paso a paso de la grulla.",
          "Ayuda mutua entre padres de diferentes filas.",
          "Colocación de las grullas en las manos de cada participante."
        ],
        "reflectiveQuestions": [
          "¿Qué le diré a mi hijo cuando llegue a casa y le muestre esta grulla?"
        ]
      },
      {
        "durationMinutes": 5,
        "title": "Cierre: Relectura del 'Espejo Roto' y Pacto de Comunidad",
        "objective": "Constatar la transformación de la mirada inicial.",
        "materials": [
          "Hojas iniciales guardadas en el bolsillo"
        ],
        "facilitatorScript": "Saquen la hoja de su bolsillo. Vuelvan a leer lo que escribieron hace una hora. Si hoy su corazón siente algo diferente, escriban abajo una nueva frase. Cerramos abrazando el compromiso de ser una comunidad que cuida y no que juzga.",
        "activitySteps": [
          "Reescritura de la frase final.",
          "Lectura voluntaria de 2 transformaciones profundas.",
          "Despedida comunitaria."
        ],
        "reflectiveQuestions": [
          "¿Estamos listos para recibir a todos los niños en nuestra escuela con los brazos abiertos?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "ficha-espejo-roto-apertura-tea",
        "title": "Ficha de Trabajo: 'El Espejo Roto' y Deconstrucción de Prejuicios",
        "description": "Plantilla en Word con el disparador de apertura, preguntas de empatía y espacio para la reescritura transformadora de la familia.",
        "isPrintableCutout": false,
        "icon": "📄"
      },
      {
        "id": "guia-origami-grulla-empatia",
        "title": "Guía Ilustrada Recortable: La Grulla de la Empatía (Origami)",
        "description": "Instructivo paso a paso con 16 ilustraciones para doblar la grulla de papel con líneas de corte (✂️) y recuadros explicativos.",
        "isPrintableCutout": true,
        "icon": "✂️"
      }
    ]
  },
  {
    "id": "descarga-emocional-inicial",
    "slug": "descarga-emocional-inicial",
    "title": "Descarga Emocional Infantil: 'Saco mis emociones jugando'",
    "subtitle": "Expresión lúdica y regulación somática del enojo, la tristeza y la alegría para niñas y niños de 3 a 5 años",
    "category": "socioemocional",
    "categoryLabel": "Desarrollo Socioemocional en Primera Infancia",
    "normativeBase": "Currículo de Educación Inicial (Mineduc) - Eje de Desarrollo Personal y Social",
    "targetAudiences": [
      "estudiantes",
      "docentes"
    ],
    "targetAudienceLabel": "Niñas y niños de Inicial 1, Inicial 2 (3 a 5 años) y Docentes Parvularias",
    "estimatedDuration": "40 minutos",
    "relatedActionPlanTopic": "Educación socioemocional temprana, expresión de afectos y prevención de conductas disruptivas",
    "generalObjective": "Facilitar un espacio lúdico y seguro para que los párvulos reconozcan, nombren y descarguen emociones intensas (enojo, miedo, tristeza) a través del cuerpo, el juego simbólico y el arte.",
    "specificObjectives": [
      "Validar que todas las emociones son naturales y tienen un lugar en el cuerpo.",
      "Liberar tensiones musculares mediante la técnica del globo que se infla y explota de risa.",
      "Plasmar mediante crayones y colores su estado emocional en la ficha didáctica guiada por el peluche 'Emoti'."
    ],
    "materialsGeneral": [
      "Peluche o títere 'Emoti'",
      "Hojas con siluetas y crayones gruesos",
      "Música infantil suave y rítmica"
    ],
    "preliminaryNotes": "Las dinámicas deben ser sumamente visuales, con instrucciones cortas y apoyo de canciones conocidas para captar la atención de los más pequeños.",
    "phases": [
      {
        "durationMinutes": 5,
        "title": "Bienvenida con el Peluche Emoti: 'Hola, emociones'",
        "objective": "Establecer clima de confianza y ternura.",
        "materials": [
          "Peluche 'Emoti'"
        ],
        "facilitatorScript": "¡Hola mis pequeños corazones! Hoy nos visita nuestro amigo el peluche Emoti. A veces Emoti está feliz, a veces tiene ganas de llorar y a veces se enoja como un leoncito. ¿Saben qué? ¡Todas las emociones son buenas! Hoy vamos a jugar con ellas para que nuestro cuerpo se sienta ligero.",
        "activitySteps": [
          "Canto de saludo infantil.",
          "Paseo del peluche Emoti para que cada niño le dé una caricia."
        ],
        "reflectiveQuestions": [
          "¿Cómo se siente nuestro corazoncito hoy: saltarín o con ganas de un abrazo?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Activación Corporal: 'Exploto como un globo de colores'",
        "objective": "Descargar energía reprimida y regular la respiración.",
        "materials": [
          "Música de fondo rítmica"
        ],
        "facilitatorScript": "¡Vamos a ser globos gigantes! Tomamos aire por la naricita... nos inflamos, nos inflamos... y ahora el globo enojado... ¡explota con un salto! Ahora nos inflamos de nuevo... y el globo cansado... se desinfla despacito hasta el suelo.",
        "activitySteps": [
          "Repetición de 3 secuencias de inflado y desinflado.",
          "Globos de risa, de enojo y de calma."
        ],
        "reflectiveQuestions": [
          "¿Verdad que cuando soltamos el aire el cuerpo se siente como una pluma?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Expresión Artística: 'Pintando mi emoción'",
        "objective": "Canalizar emociones mediante el trazo gráfico libre.",
        "materials": [
          "Fichas con caritas de emociones y crayones de colores"
        ],
        "facilitatorScript": "Emoti les entrega su hoja. Si hoy sienten alegría, pueden pintar con el color del sol; si tienen tristeza, con el color de la lluvia; y si están enojados, pueden hacer rayas fuertes para que el enojo salga del cuerpo al papel.",
        "activitySteps": [
          "Dibujo libre en el aula.",
          "Acompañamiento individual del facilitador validando cada color y trazo."
        ],
        "reflectiveQuestions": [
          "¿Qué le podemos decir a nuestro dibujo para que se sienta feliz?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Rincón de la Calma y Abrazo de Osito",
        "objective": "Cerrar en estado de serenidad y pertenencia grupal.",
        "materials": [
          "Cojines o alfombra suave"
        ],
        "facilitatorScript": "Nos sentamos en la alfombra, cruzamos los bracitos sobre nuestro pecho y nos damos un abrazo de osito bien apretado. Le decimos a nuestro cuerpo: 'Gracias por jugar, estás seguro y aquí te queremos'.",
        "activitySteps": [
          "Auto-abrazo guiado.",
          "Canción de despedida suave."
        ],
        "reflectiveQuestions": [
          "¿Quién nos va a dar un abrazo cuando lleguemos a casa?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "caritas-emociones-recortables-inicial",
        "title": "Caritas de Emociones Recortables y Ficha 'Pintando mi Emoción'",
        "description": "Lámina didáctica en Word con siluetas de caritas expresivas para colorear y recortar con líneas punteadas (✂️) adaptadas a Inicial.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "ficha-guia-peluche-emoti",
        "title": "Guía Metodológica para Docentes Parvularias: El Rincón de la Calma",
        "description": "Protocolo para implementar el espacio de autorregulación emocional en el aula de 3 a 5 años.",
        "isPrintableCutout": false,
        "icon": "📄"
      }
    ]
  },
  {
    "id": "descarga-emocional-elemental-media",
    "slug": "descarga-emocional-elemental-media",
    "title": "Descarga Emocional y Atención Plena: 'Yo vengo de Marte'",
    "subtitle": "Mindfulness, exploración sensorial y autorregulación física para estudiantes de 8 a 12 años",
    "category": "socioemocional",
    "categoryLabel": "Atención Plena y Autorregulación",
    "normativeBase": "Eje Socioemocional del Plan Nacional de Educación y Convivencia Escolar",
    "targetAudiences": [
      "estudiantes"
    ],
    "targetAudienceLabel": "Estudiantes de Básica Elemental y Media (8 a 12 años)",
    "estimatedDuration": "45 minutos",
    "relatedActionPlanTopic": "Técnicas de mindfulness, reducción del estrés escolar y autoconocimiento",
    "generalObjective": "Enseñar a los niños a desacelerar el ritmo mental y conectar con el momento presente a través de los sentidos y la metáfora del explorador espacial.",
    "specificObjectives": [
      "Descargar tensiones somáticas mediante el ejercicio motor de sacudimiento de extremidades.",
      "Practicar mindfulness sensorial guiado degustando un elemento natural como si fuera un objeto desconocido de otro planeta.",
      "Elaborar una bitácora personal de recursos de calma para usar ante frustraciones o ira en clase."
    ],
    "materialsGeneral": [
      "Dos pasas o frutas secas por estudiante",
      "Música ambiental suave",
      "Fichas de la bitácora del explorador"
    ],
    "preliminaryNotes": "Verificar previamente posibles alergias alimentarias en el grupo antes de entregar la fruta deshidratada; en su defecto se puede usar una semilla o textura natural.",
    "phases": [
      {
        "durationMinutes": 5,
        "title": "Bienvenida y Encuadre: 'Exploradores de otro planeta'",
        "objective": "Despertar curiosidad y establecer normas de respeto.",
        "materials": [
          "Música instrumental"
        ],
        "facilitatorScript": "Hoy haremos un viaje muy especial, no hacia otro país, sino hacia nosotros mismos. Vamos a aprender a mirar, oler y sentir como si fuéramos astronautas recién aterrizados del planeta Marte.",
        "activitySteps": [
          "Disposición en círculo de concentración.",
          "Reglas: escuchamos con respeto, participamos sin burlas y lo que sentimos está bien."
        ],
        "reflectiveQuestions": [
          "¿Alguna vez han sentido que su mente va tan rápido que parece un tren que no frena?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Activación: 'Sacudiendo las emociones pegadas al cuerpo'",
        "objective": "Liberar agitación motriz y preparar la receptividad sensorial.",
        "materials": [
          "Música dinámica y luego silenciada"
        ],
        "facilitatorScript": "De pie: sacudimos las manos como si tuviéramos agua en los dedos... ahora los hombros... las piernas... ¡todo el cuerpo! Y ahora... estatua de sal. Respira hondo por la nariz y siente el hormigueo en tus palmas.",
        "activitySteps": [
          "Sacudimiento progresivo de articulaciones.",
          "Parada súbita de atención interoceptiva.",
          "Tres respiraciones profundas diafragmáticas."
        ],
        "reflectiveQuestions": [
          "¿Notaron cómo el cuerpo se siente más cálido y despierto?"
        ]
      },
      {
        "durationMinutes": 20,
        "title": "Ejercicio Principal: 'Yo vengo de Marte' (Mindfulness con Pasas)",
        "objective": "Entrenar la atención focalizada y ralentizar el impulso impulsivo.",
        "materials": [
          "2 Pasas o frutos secos en servilleta por niño"
        ],
        "facilitatorScript": "Imaginen que acaban de llegar de Marte. Nunca han visto este objeto. Mírenlo con una lupa mental: ¿qué color tiene, cuántos pliegues? Tóquenlo con los ojos cerrados: ¿es suave o rugoso? Llévenlo a la oreja: ¿hace algún sonido? Ahora a la nariz: ¿a qué huele? Finalmente, pónganlo en la lengua sin morderlo durante 30 segundos... sientan cómo se hidrata. Ahora den un solo mordisco suave... ¿qué explosión de sabor sienten?",
        "activitySteps": [
          "Guía sensorial pausada en 5 fases (vista, tacto, oído, olfato, gusto).",
          "Degustación consciente sin hablar.",
          "Reflexión colectiva de la experiencia sensorial."
        ],
        "reflectiveQuestions": [
          "¿Cuánto solemos tardar normalmente en tragarnos una golosina sin darnos cuenta de su sabor?",
          "¿Cómo nos ayuda este freno de mano cuando estamos a punto de gritarle a un compañero?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Bitácora del Explorador y Cierre",
        "objective": "Fijar el aprendizaje en su kit de recursos escolares.",
        "materials": [
          "Ficha de la Bitácora del Explorador"
        ],
        "facilitatorScript": "En su bitácora anoten su 'superpoder marciano': cuando sientan ira en el recreo o miedo antes de un examen, recuerden que pueden activar su respiración de astronauta y volver a la calma.",
        "activitySteps": [
          "Registro en la ficha recortable.",
          "Compromiso de aplicar el ejercicio durante la semana."
        ],
        "reflectiveQuestions": [
          "¿En qué momento de mi día me vendría bien hacer una pausa de astronauta?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "bitacora-explorador-marte-mindfulness",
        "title": "Ficha Didáctica Recortable: 'Bitácora del Explorador de Marte'",
        "description": "Formato recortable (✂️) para registrar observaciones sensoriales y técnicas de anclaje de atención plena en aula.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "tarjetas-tecnicas-calma-elemental",
        "title": "Tarjetas de Bolsillo: Técnicas Rápidas de Calma en el Aula",
        "description": "Set de 4 tarjetas recortables con ejercicios visuales de respiración 4x4, anclaje de 5 sentidos y abrazo de mariposa.",
        "isPrintableCutout": true,
        "icon": "✂️"
      }
    ]
  },
  {
    "id": "descarga-emocional-basica-superior",
    "slug": "descarga-emocional-basica-superior",
    "title": "Atención Plena y Regulación Emocional: 'Lo que ves y lo que crees'",
    "subtitle": "Observación consciente, reencuadre de distorsiones cognitivas y liberación de presión social en adolescentes de 12 a 15 años",
    "category": "socioemocional",
    "categoryLabel": "Salud Emocional y Reencuadre Cognitivo",
    "normativeBase": "Guía de Bienestar Emocional en la Adolescencia (Mineduc)",
    "targetAudiences": [
      "estudiantes"
    ],
    "targetAudienceLabel": "Adolescentes de Básica Superior (12 a 15 años)",
    "estimatedDuration": "45 minutos",
    "relatedActionPlanTopic": "Manejo de la ansiedad adolescente, distorsiones cognitivas y autorregulación",
    "generalObjective": "Proporcionar a los adolescentes herramientas de atención plena y discriminación cognitiva para diferenciar los hechos reales de las historias limitantes que crea la mente.",
    "specificObjectives": [
      "Comprender la diferencia entre observar con atención y dejarse llevar por la mente dispersa.",
      "Identificar cómo los pensamientos automáticos negativos condicionan el estado de ánimo y las conductas de aislamiento.",
      "Entrenar la técnica de anclaje mental 'Hechos vs. Interpretaciones'."
    ],
    "materialsGeneral": [
      "Bandeja con 12 objetos variados y tela para cubrirlos",
      "Hojas de trabajo y lápices",
      "Fichas de reencuadre cognitivo"
    ],
    "preliminaryNotes": "La dinámica de la bandeja no es un concurso de memoria intelectual, sino una demostración práctica de cómo la ansiedad bloquea la percepción.",
    "phases": [
      {
        "durationMinutes": 5,
        "title": "Bienvenida: '¿Cómo llego hoy en una sola palabra?'",
        "objective": "Encuadre emocional sin juzgar.",
        "materials": [
          "Círculo de sillas"
        ],
        "facilitatorScript": "Bienvenidos. Hoy no venimos a evaluar nada ni a poner notas. En círculo, cada uno diga una sola palabra que describa cómo llega su mente hoy: cansada, dispersa, tranquila, ansiosa... Gracias por su honestidad.",
        "activitySteps": [
          "Ronda relámpago de palabras.",
          "Agradecimiento y validación del facilitador."
        ],
        "reflectiveQuestions": [
          "¿Cuánto peso cargamos en la cabeza que no tiene nada que ver con las materias del colegio?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Actividad: 'Lo que ves y lo que crees' (La Bandeja de 12 Objetos)",
        "objective": "Evidenciar la diferencia entre observar en calma y apresurarse con ansiedad.",
        "materials": [
          "Bandeja con 12 objetos cotidianos cubierta con tela"
        ],
        "facilitatorScript": "Destaparé esta bandeja con 12 objetos durante 30 segundos. Su tarea no es memorizar compitiendo, sino observar con calma. Luego cubro la bandeja y en sus hojas anotan lo que recuerdan.",
        "activitySteps": [
          "Exposición de 30 segundos de la bandeja.",
          "Escritura individual de recuerdos.",
          "Descubrimiento y comparación.",
          "Reflexión guiada: ¿Qué pensamientos aparecieron cuando creyeron que no recordarían nada?"
        ],
        "reflectiveQuestions": [
          "¿Notaron cómo el pensamiento 'no puedo' nos quita atención de lo que tenemos frente a los ojos?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Ejercicio de Reencuadre: Hechos vs. Interpretaciones",
        "objective": "Aprender a desmontar rumores, inseguridades y sobre-interpretaciones sociales.",
        "materials": [
          "Tarjetas de reencuadre cognitivo"
        ],
        "facilitatorScript": "Un hecho es: 'Tu amigo no te saludó al entrar al patio'. La interpretación de tu mente es: 'Está enojado conmigo, ya no le caigo bien'. Analicemos cómo inventamos historias catastróficas que nos amargan el día sin ser verdad.",
        "activitySteps": [
          "Trabajo con 4 casos típicos de la vida adolescente.",
          "Separación en dos columnas: Lo que pasó realmente vs. Lo que mi mente inventó.",
          "Reformulación de respuestas asertivas."
        ],
        "reflectiveQuestions": [
          "¿Cuántas peleas o tristezas nos ahorraríamos si preguntáramos en vez de suponer?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Respiración de Anclaje y Despedida Consciente",
        "objective": "Restablecer equilibrio psicofísico antes de volver a clases.",
        "materials": [
          "Música instrumental suave"
        ],
        "facilitatorScript": "Pies en el suelo, espalda recta. Inhalamos profundo en 4 tiempos... sostenemos en 2... soltamos en 4. Recuerda: tú no eres tus pensamientos, tú eres quien decide qué hacer con ellos.",
        "activitySteps": [
          "3 Ciclos de respiración consciente.",
          "Entrega de tarjeta de bolsillo con el ejercicio Hecho vs. Interpretación."
        ],
        "reflectiveQuestions": [
          "¿Qué interpretación negativa voy a soltar el día de hoy?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "tarjetas-reencuadre-hechos-interpretaciones",
        "title": "Tarjetas Recortables de Trabajo: Hechos vs. Interpretaciones",
        "description": "Fichas de reencuadre cognitivo con líneas de corte (✂️) para analizar situaciones de malentendido social y reducir la ansiedad interpersonal.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "guia-observacion-mindfulness-adolescentes",
        "title": "Guía Práctica: Observación Consciente y Calma en 3 Minutos",
        "description": "Tríptico para estudiantes con la técnica de anclaje de la respiración y los 12 objetos de enfoque.",
        "isPrintableCutout": false,
        "icon": "📄"
      }
    ]
  },
  {
    "id": "descarga-emocional-bachillerato",
    "slug": "descarga-emocional-bachillerato",
    "title": "Conciencia Corporal y Descarga: 'Mi cuerpo habla, mi mente escucha'",
    "subtitle": "Somatización del estrés académico, escaneo corporal profundo y cartas de descarga emocional en bachilleres",
    "category": "socioemocional",
    "categoryLabel": "Conciencia Corporal y Manejo del Estrés",
    "normativeBase": "Estrategias de Contención Emocional para el Nivel de Bachillerato (Mineduc)",
    "targetAudiences": [
      "estudiantes"
    ],
    "targetAudienceLabel": "Estudiantes de 1ro, 2do y 3ro de Bachillerato (15 a 18 años)",
    "estimatedDuration": "50 minutos",
    "relatedActionPlanTopic": "Prevención del estrés crónico en bachillerato, somatizaciones y resiliencia",
    "generalObjective": "Permitir que los estudiantes de bachillerato reconozcan los síntomas físicos de la sobrecarga emocional y académica, facilitando la liberación somática y el autocuidado consciente.",
    "specificObjectives": [
      "Identificar las zonas corporales donde se acumula la tensión (mandíbula, cuello, hombros, estómago).",
      "Practicar una sesión guiada de escaneo corporal y respiración diafragmática para modular el sistema nervioso simpático.",
      "Exteriorizar mediante la escritura reflexiva de una carta de permiso para soltar presiones que no les corresponden."
    ],
    "materialsGeneral": [
      "Ficha de mapa corporal anatómico",
      "Música de relajación profunda",
      "Hojas para la carta de descarga emocional"
    ],
    "preliminaryNotes": "Crear un ambiente de penumbra y calma en el salón para favorecer la introspección de los jóvenes que suelen vivir con sobreestimulación tecnológica.",
    "phases": [
      {
        "durationMinutes": 5,
        "title": "Apertura: 'Hoy mi cuerpo se siente...'",
        "objective": "Enfocar la atención en el estado corporal presente.",
        "materials": [
          "Música de relajación"
        ],
        "facilitatorScript": "A veces nuestro cuerpo sabe cosas que nuestra mente aún no se atreve a admitir: agotamiento, contracturas, dolor de estómago. Hoy vamos a parar. Cada uno complete mentalmente: 'Hoy mi cuerpo se siente...'. No hay respuestas incorrectas.",
        "activitySteps": [
          "Check-in corporal individual.",
          "Encuadre del facilitador sobre la somatización: lo que no se habla, el cuerpo lo grita."
        ],
        "reflectiveQuestions": [
          "¿Cuántos días llevamos despertando cansados sin saber por qué?"
        ]
      },
      {
        "durationMinutes": 20,
        "title": "Escaneo y Conciencia Corporal: 'Las señales que ignoramos'",
        "objective": "Relajar progresivamente los grupos musculares contraídos por la tensión.",
        "materials": [
          "Guía de escaneo corporal"
        ],
        "facilitatorScript": "Cierren los ojos o bajen la mirada. Sientan el aire entrar por la nariz... relajen la mandíbula, separen los dientes... dejen caer los hombros como si se derritieran hacia el suelo... noten su respiración sin intentar cambiarla. Pregúntense: ¿Dónde guardo mi miedo, dónde guardo mi rabia?",
        "activitySteps": [
          "Guiado de escaneo cefalocaudal (cabeza a pies).",
          "Detección consciente de rigideces somáticas.",
          "Visualización de descarga de tensión hacia la tierra en cada exhalación."
        ],
        "reflectiveQuestions": [
          "¿Se dieron cuenta de cuánta tensión innecesaria tenían apretando los dientes o los hombros?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Actividad Expresiva: Mapa Corporal del Estrés y Descarga",
        "objective": "Mapear gráficamente las emociones atrapadas y exteriorizarlas en papel.",
        "materials": [
          "Ficha con silueta anatómica"
        ],
        "facilitatorScript": "En su silueta dibujen con colores o texturas las zonas donde sintieron peso: calor en el pecho, nudo en la garganta, pesadez en las piernas. Y al lado, escriban qué situación o exigencia está detrás de ese síntoma.",
        "activitySteps": [
          "Mapeo individual en la ficha.",
          "Toma de conciencia del origen de la somatización (exámenes, peleas familiares, futuro vocacional)."
        ],
        "reflectiveQuestions": [
          "¿Qué me está pidiendo mi cuerpo a gritos: descanso, poner un límite o pedir ayuda?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Cierre: Carta de Permiso para Descansar y Cuidarme",
        "objective": "Formalizar un acuerdo ético de autocuidado.",
        "materials": [
          "Hojas para carta personal"
        ],
        "facilitatorScript": "Escriban una breve carta a ustedes mismos comenzando así: 'Me doy permiso para... (no ser perfecto, descansar sin culpa, decir que no)'. Guárdenla en un lugar secreto.",
        "activitySteps": [
          "Escritura de la carta de permiso.",
          "Respiración final colectiva y despedida serena."
        ],
        "reflectiveQuestions": [
          "¿De qué exigencia me voy a liberar hoy mismo?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "mapa-corporal-somatizacion-bachillerato",
        "title": "Ficha Didáctica Recortable: Mapa Corporal de la Somatización",
        "description": "Esquema anatómico para colorear y mapear focos somáticos de estrés con líneas de corte punteadas (✂️) para el trabajo individual.",
        "isPrintableCutout": true,
        "icon": "✂️"
      },
      {
        "id": "carta-soltar-cargas-compromiso",
        "title": "Carta de Autocuidado: 'Me doy permiso para soltar el agobio'",
        "description": "Formato reflexivo para formalizar acuerdos de descanso, desconexión de pantallas y límites saludables.",
        "isPrintableCutout": false,
        "icon": "📄"
      }
    ]
  },
  {
    "id": "intervencion-crisis-afectacion-alta",
    "slug": "intervencion-crisis-afectacion-alta",
    "title": "Taller para Grupos con Nivel de Afectación Alto: 'Honrar la vida, cuidar el corazón'",
    "subtitle": "Intervención en postvención, duelo colectivo, contención emocional y activación del protocolo ante crisis",
    "category": "intervencion",
    "categoryLabel": "Intervención en Crisis y Postvención",
    "normativeBase": "Protocolo de Actuación ante Situaciones de Intento y Consumación del Suicidio en el Sistema Educativo (Mineduc/MSP)",
    "targetAudiences": [
      "estudiantes",
      "docentes",
      "familias"
    ],
    "targetAudienceLabel": "Grupos de Estudiantes y Docentes con Afectación Emocional Severa, Duelo Colectivo o Postvención",
    "estimatedDuration": "60 minutos",
    "relatedActionPlanTopic": "Postvención, duelo comunitario, primeros auxilios psicológicos avanzados y prevención del suicidio",
    "generalObjective": "Brindar contención emocional estructurada y segura a grupos que han experimentado pérdidas traumáticas, intentos autolíticos de pares o crisis de alta intensidad, resignificando el dolor y fortaleciendo redes de vida.",
    "specificObjectives": [
      "Generar un encuadre de contención y confidencialidad absoluta sin revictimizar ni forzar la expresión emocional.",
      "Facilitar la expresión simbólica del duelo mediante la dinámica 'El eco del silencio' con luz/vela.",
      "Activar el Protocolo de Acción Inmediata ante Descompensaciones Emocionales durante talleres mediante la dupla de psicólogos facilitadores."
    ],
    "materialsGeneral": [
      "Vela o luz LED central",
      "Música instrumental suave",
      "Protocolo de acción inmediata ante crisis para facilitadores",
      "Tarjetas de anclaje emocional"
    ],
    "preliminaryNotes": "OBLIGATORIO: Este taller debe ser facilitado por una dupla de profesionales DECE (Psicólogo 1 para contención individual en sala contigua si surge una crisis aguda; Psicólogo 2 para sostener el grupo).",
    "phases": [
      {
        "durationMinutes": 10,
        "title": "Bienvenida y Encuadre Seguro: El Círculo de Contención",
        "objective": "Establecer acuerdos de cuidado mutuo y seguridad emocional.",
        "materials": [
          "Círculo de sillas sin obstáculos"
        ],
        "facilitatorScript": "Hoy nos reunimos para hablar desde el corazón. No venimos a revivir el dolor ni a buscar culpables, sino a cuidarnos como comunidad. Nadie está obligado a hablar; el silencio también es una forma de estar presentes y se respeta absolutamente. Lo que aquí se diga se queda aquí.",
        "activitySteps": [
          "Presentación de la dupla de facilitadores y encuadre seguro.",
          "Cada estudiante comparte una sola palabra o la escribe en un papelito anónimo que se coloca en una caja simbólica."
        ],
        "reflectiveQuestions": [
          "¿Cómo podemos sostenernos entre todos cuando una tristeza parece demasiado grande?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Sensibilización y Respeto: 'El eco del silencio'",
        "objective": "Honrar la memoria y legitimar el dolor colectivo.",
        "materials": [
          "Vela o luz LED en el centro del salón"
        ],
        "facilitatorScript": "Colocamos esta luz en el centro y guardamos un minuto de silencio respetuoso. Cuando una persona parte o atraviesa una oscuridad profunda, deja un eco en nuestros corazones. Ese eco a veces es tristeza, a veces es enojo o confusión. Hoy queremos abrazar ese eco para convertirlo en cuidado mutuo.",
        "activitySteps": [
          "Minuto de silencio respetuoso.",
          "Apertura voluntaria para compartir qué resonó en el silencio."
        ],
        "reflectiveQuestions": [
          "¿Por qué es importante permitirnos llorar y sentir sin que nadie nos diga 'ya no estés triste'?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Conexión Corporal: Escuchar las señales del dolor sin juicio",
        "objective": "Regular la hiperactivación fisiológica del sistema nervioso.",
        "materials": [
          "Música instrumental suave"
        ],
        "facilitatorScript": "El dolor no es solo una idea, se siente en la garganta apretada, en el estómago revuelto o en las manos frías. Pongamos una mano en el pecho y otra en el abdomen. Sientan el latido de su corazón: su corazón sigue latiendo, estamos vivos, estamos juntos.",
        "activitySteps": [
          "Respiración diafragmática pausada (Inhalo 1-2-3, Exhalo 1-2-3).",
          "Grounding de los 5 sentidos en el aula para asegurar presencia y contacto con la realidad."
        ],
        "reflectiveQuestions": [
          "¿Qué me ayuda a sentir los pies firmes en la tierra cuando siento que todo tiembla?"
        ]
      },
      {
        "durationMinutes": 15,
        "title": "Descarga Simbólica: 'Dejo ir para continuar'",
        "objective": "Canalizar la culpa o la impotencia hacia propósitos de vida.",
        "materials": [
          "Tarjetas de descarga simbólica"
        ],
        "facilitatorScript": "Escriban en su tarjeta lo que necesitan soltar: la culpa, la rabia, las preguntas sin respuesta. Y al reverso, escriban qué regalo de vida o qué compromiso de cuidado mutuo eligen mantener encendido.",
        "activitySteps": [
          "Escritura en tarjetas recortables individuales.",
          "Depósito voluntario en el cofre simbólico de la comunidad."
        ],
        "reflectiveQuestions": [
          "¿Cómo honramos la vida de quienes amamos a través de nuestras propias acciones cotidianas?"
        ]
      },
      {
        "durationMinutes": 10,
        "title": "Cierre Contenedor y Redes de Vida",
        "objective": "Garantizar que ningún participante quede en descompensación al retirarse.",
        "materials": [
          "Directorio de apoyo psicológico 24/7 (Línea 171 opción 6 y ECU-911)"
        ],
        "facilitatorScript": "Nadie se va de esta sala solo. Si alguno siente que la angustia sigue muy alta, el equipo DECE estará esperándolos en la oficina. Cuidarnos es un compromiso de todos los días.",
        "activitySteps": [
          "Chequeo visual individual de cada estudiante por la dupla de psicólogos.",
          "Entrega de la tarjeta de contacto permanente con el DECE.",
          "Derivación inmediata si se detecta riesgo según el protocolo adjunto."
        ],
        "reflectiveQuestions": [
          "¿A qué amigo le diré hoy: 'Estoy aquí si me necesitas'?"
        ]
      }
    ],
    "downloadableMaterials": [
      {
        "id": "protocolo-bolsillo-crisis-durante-talleres",
        "title": "Protocolo de Bolsillo: Acción Inmediata ante Crisis Emocional durante Talleres",
        "description": "Herramienta técnica obligatoria para facilitadores DECE: evaluación de gravedad, roles de la dupla, contención somática y derivación de emergencia.",
        "isPrintableCutout": false,
        "icon": "📄"
      },
      {
        "id": "tarjetas-honrar-vida-redes-cuidado",
        "title": "Tarjetas Recortables: 'Honrar la Vida y Redes de Cuidado Mutuo'",
        "description": "Fichas con líneas de corte punteadas (✂️) para el ejercicio de descarga simbólica 'Dejo ir para continuar' y directorio de emergencia.",
        "isPrintableCutout": true,
        "icon": "✂️"
      }
    ]
  }
];

export function getWorkshopById(idOrSlug: string): Workshop | undefined {
  const norm = idOrSlug.toLowerCase().trim();
  return WORKSHOPS_DATABASE.find(
    (w) => w.id.toLowerCase() === norm || w.slug.toLowerCase() === norm
  );
}

export function getAllWorkshops(): Workshop[] {
  return WORKSHOPS_DATABASE;
}
