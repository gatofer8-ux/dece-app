import type { WorkshopItem } from "./types";

export const WORKSHOPS_DATABASE: WorkshopItem[] = [
  // --- TALLERES LOTE 1 (2023 - 2024) ---
  {
    id: "prevencion-suicidio",
    slug: "prevencion-suicidio",
    title: "Taller de Prevención del Suicidio y Conductas Autolíticas: Señales de Alerta y Redes de Apoyo",
    subtitle: "Herramientas de detección temprana, mitos vs. realidades y fortalecimiento de factores protectores en el aula.",
    category: "PREVENCION_044A",
    categoryLabel: "Prevención Acuerdo 044-A",
    normativeBase: "Acuerdo Ministerial MINEDUC-044-A (Temática 4) & LOEI Art. 73",
    targetAudiences: ["DOCENTES", "ESTUDIANTES_SECUNDARIA", "COMUNIDAD_EDUCATIVA"],
    targetAudienceLabel: "Docentes, Estudiantes de Básica Superior / Bachillerato y Familias",
    estimatedDuration: "90 minutos",
    relatedActionPlanTopic: "SUICIDIO",
    generalObjective: "Aumentar la sensibilización de la comunidad educativa sobre la prevención de conductas autolíticas, brindando herramientas prácticas para identificar oportunamente señales de alerta, derribar mitos y activar rutas institucionales de contención y derivación.",
    specificObjectives: [
      "Identificar señales de alerta conductuales, verbales y emocionales de riesgo autolítico en el ámbito escolar.",
      "Desmitificar creencias erróneas sobre el suicidio que obstaculizan la búsqueda de ayuda.",
      "Promover la empatía grupal, el compañerismo y la comunicación abierta a través de dinámicas vivenciales.",
      "Socializar el protocolo oficial de notificación inmediata y activación de servicios de emergencia (ECU-911)."
    ],
    materialsGeneral: [
      "Tarjetas de casos de simulación impresas",
      "Hojas de papel y bolígrafos",
      "Pelota o elemento de paso para dinámica grupal",
      "Lápices de colores y notas adhesivas",
      "Pizarra o papelógrafo para plenaria"
    ],
    preliminaryNotes: "El facilitador debe remarcar antes de iniciar que este es un espacio seguro, confidencial y respetuoso. Si algún estudiante o docente se siente conmovido o abrumado durante la sesión, se le recordará que puede solicitar un momento a solas con el profesional DECE para contención individual inmediata.",
    phases: [
      {
        number: 1,
        title: "Bienvenida, Encuadre y Acuerdos de Confidencialidad",
        durationMinutes: 15,
        objective: "Establecer un clima de confianza, empatía y respeto entre los participantes.",
        facilitatorScript: "¡Buenas tardes a todas y todos! Hoy nos reunimos para hablar de un tema de vital importancia para nuestra comunidad: el cuidado de nuestra vida, nuestra salud emocional y cómo podemos ser guardianes y apoyo para nosotros mismos y para quienes nos rodean.\\n\\nQuiero comenzar agradeciéndoles por su presencia. Este espacio está diseñado con base en el respeto mutuo y la confidencialidad. Lo que compartamos aquí se queda aquí. Hablar de nuestras emociones no nos hace débiles; al contrario, pedir ayuda y saber escuchar es el mayor acto de valentía y solidaridad que podemos demostrar en nuestra institución.",
        groupDynamics: "Explicar las 3 reglas de oro del taller: 1) Escucha activa sin juicios; 2) Confidencialidad absoluta; 3) Derecho a hacer una pausa si las emociones se vuelven intensas.",
        reflectionQuestions: [
          "¿Por qué a veces nos cuesta hablar sobre cómo nos sentimos cuando estamos tristes o desesperados?",
          "¿Qué significa para ustedes contar con una red de apoyo en el colegio?"
        ]
      },
      {
        number: 2,
        title: "Dinámica Rompehielos: 'La Cadena de Apoyo'",
        durationMinutes: 15,
        objective: "Visibilizar que nadie está solo y que las palabras positivas tienen un impacto protector.",
        facilitatorScript: "Nos vamos a colocar en círculo. Cada uno tiene una pequeña tarjeta. Van a escribir en ella una frase o palabra de aliento que a ustedes les gustaría escuchar cuando están pasando por un día muy difícil (ej: 'No estás solo', 'Vales mucho', 'Esto también pasará').\\n\\nAhora vamos a lanzar este balón a un compañero al azar. Quien lo reciba leerá su frase con voz clara y compartirá por qué esa frase le reconforta, luego se la pasará a otro compañero hasta que todos hayamos tejido una red protectora de palabras.",
        groupDynamics: "Dinámica de la Cadena de Apoyo en círculo con un balón o madeja de lana.",
        materialsNeeded: ["Tarjetas de apoyo", "Balón o madeja de lana"]
      },
      {
        number: 3,
        title: "Actividad Central: Juego de Roles y Análisis de Casos 'Identificando Señales de Alerta'",
        durationMinutes: 30,
        objective: "Entrenar la capacidad de observación para reconocer niveles de riesgo y saber cómo intervenir sin juzgar.",
        facilitatorScript: "Vamos a dividirnos en 4 grupos de trabajo. A cada grupo le entregaré una tarjeta con un caso real anonimizado (Caso 1: Estrés académico, Caso 2: Depresión y aislamiento, Caso 3: Conductas de riesgo y autolesiones, Caso 4: Crisis de riesgo inminente).\\n\\nEn sus grupos van a leer el caso y responderán tres preguntas clave:\\n1. ¿Cuáles son las señales de alerta que muestra el estudiante?\\n2. ¿Qué actitudes o respuestas por parte de compañeros o profesores empeorarían su situación?\\n3. ¿Cuál es el paso correcto que debemos dar de inmediato?",
        groupDynamics: "Trabajo en subgrupos utilizando el material recortable de casos. El facilitador monitorea las mesas y orienta las respuestas.",
        materialsNeeded: ["Juego de Tarjetas de Casos de Simulación (Material descargable oficial)"]
      },
      {
        number: 4,
        title: "Actividad Creativa: 'Cartas de Esperanza y Botiquín Emocional'",
        durationMinutes: 20,
        objective: "Generar recursos de afrontamiento personal y mensajes que puedan acompañar momentos difíciles.",
        facilitatorScript: "En este momento cada participante va a redactar una 'Carta de Esperanza' dirigida a su 'yo del futuro' o a un ser querido. ¿Qué le dirías a esa persona para recordarle que su presencia en este mundo es irremplazable? Además, escribiremos en nuestro botiquín emocional 3 acciones a las que podemos recurrir cuando sintamos que las emociones nos desbordan (ej. llamar a mi amigo de confianza, escuchar mi canción favorita, caminar, acudir al DECE).",
        groupDynamics: "Escritura reflexiva individual con música instrumental suave de fondo.",
        materialsNeeded: ["Hojas de Cartas de Esperanza", "Bolígrafos y colores"]
      },
      {
        number: 5,
        title: "Cierre, Ruta Institucional y Líneas de Ayuda",
        durationMinutes: 10,
        objective: "Fijar con claridad el protocolo del Mineduc y los contactos de emergencia disponibles 24/7.",
        facilitatorScript: "Para cerrar, recordemos la ruta oficial de nuestra institución:\\n- Si detectas que un compañero está en riesgo, avisa de inmediato a tu docente tutor o al personal del DECE. No te quedes con ese secreto: buscar ayuda salva vidas.\\n- Ante cualquier emergencia fuera del horario escolar, recuerda que la línea nacional 171 (opción 6 de salud mental) y el ECU-911 están disponibles las 24 horas del día de manera gratuita y confidencial.\\n\\nGracias a cada uno de ustedes por su apertura, respeto y compromiso con la vida.",
        reflectionQuestions: [
          "¿Qué aprendizaje nuevo te llevas de este espacio?",
          "¿A quién te comprometes a cuidar y escuchar a partir de hoy?"
        ]
      }
    ],
    downloadableMaterials: [
      {
        id: "casos-simulacion-suicidio",
        title: "Tarjetas de Casos de Simulación por Niveles de Riesgo",
        description: "Contiene los 6 casos de simulación con recuadros punteados listos para imprimir y recortar. Incluye rúbrica para identificar Nivel Bajo (Verde), Moderado (Amarillo), Alto (Naranja) y Crítico (Rojo), junto con las preguntas de debate.",
        type: "RECORTABLE",
        targetUser: "Docentes y Estudiantes de Básica Superior / Bachillerato",
        printInstructions: "Imprimir en hojas de papel bond o cartulina blanca A4. Recortar por las líneas punteadas para entregar un caso por subgrupo de trabajo.",
        fileName: "Casos_Simulacion_Prevencion_Suicidio_SADEX.docx"
      },
      {
        id: "guia-senales-alerta-mitos",
        title: "Guía Didáctica: Señales Tempranas y Mitos vs. Realidades",
        description: "Ficha sintética y visual con la lista de señales verbales, conductuales y emocionales de riesgo, el comparativo de mitos comunes y los números de contacto de auxilio (ECU-911 y Línea 171).",
        type: "FICHA_TRABAJO",
        targetUser: "Docentes Tutores y Estudiantes",
        printInstructions: "Imprimir a doble cara si es posible. Ideal para pegar en la cartelera del aula o guardar en la carpeta pedagógica del docente.",
        fileName: "Ficha_Senales_Alerta_y_Mitos_SADEX.docx"
      }
    ]
  },
  {
    id: "primeros-auxilios-psicologicos",
    slug: "primeros-auxilios-psicologicos",
    title: "Taller Práctico de Primeros Auxilios Psicológicos (PAP) en el Entorno Educativo",
    subtitle: "Protocolos de contención inmediata, regulación emocional y acompañamiento en situaciones de crisis escolar.",
    category: "PRIMEROS_AUXILIOS_PAP",
    categoryLabel: "Soporte y Crisis Emocional (PAP)",
    normativeBase: "Modelo de Gestión DECE & Guías de Intervención en Crisis MINEDUC",
    targetAudiences: ["DOCENTES", "PROFESIONALES_DECE", "COMUNIDAD_EDUCATIVA"],
    targetAudienceLabel: "Personal Docente, Administrativo y Profesionales DECE",
    estimatedDuration: "90 minutos",
    relatedActionPlanTopic: "SALUD_MENTAL",
    generalObjective: "Capacitar al personal docente y administrativo en la aplicación de los 5 principios fundamentales de los Primeros Auxilios Psicológicos (PAP) para responder con empatía, calma y seguridad ante descompensaciones emocionales o eventos críticos en el aula.",
    specificObjectives: [
      "Diferenciar con claridad el alcance de los PAP (apoyo inmediato y no invasivo) respecto a una terapia psicológica clínica.",
      "Dominar las 3 fases de actuación en crisis: Acercamiento seguro, Contención/Alivio y Enlace con redes.",
      "Entrenar técnicas prácticas de autorregulación emocional: respiración diafragmática y ejercicios de enraizamiento (Grounding).",
      "Prevenir la revictimización y el desborde emocional mediante pautas claras de 'Qué hacer y qué evitar'."
    ],
    materialsGeneral: [
      "Guías de bolsillo de PAP impresas",
      "Tarjetas de ejercicios de regulación emocional",
      "Proyector o pantalla para video tutorial de apoyo",
      "Hojas de registro de descompensación emocional para docentes"
    ],
    preliminaryNotes: "Se debe hacer énfasis en que los docentes NO necesitan ser psicólogos para aplicar PAP. Los PAP son una herramienta humana de contención inicial basada en la calma, la escucha activa y la seguridad física y emocional.",
    phases: [
      {
        number: 1,
        title: "Encuadre Conceptual: ¿Qué son y qué NO son los PAP?",
        durationMinutes: 15,
        objective: "Desmitificar la intervención en crisis y delimitar el rol protector del docente.",
        facilitatorScript: "Estimados compañeros educadores: En nuestro día a día en el aula nos encontramos frecuentemente con estudiantes que experimentan ataques de pánico, llanto incontrolable por crisis familiares o bloqueos ante situaciones de estrés extremo.\\n\\nLos Primeros Auxilios Psicológicos son como los primeros auxilios médicos: no reemplazan a la cirugía ni al médico especialista, pero detienen la hemorragia y salvan vidas en los primeros minutos. Los PAP buscan brindar alivio inmediato, devolver la sensación de seguridad y evitar que el evento traumático se agrave. No juzgamos, no diagnosticamos, no forzamos a hablar: acompañamos con calidez y presencia tranquilizadora.",
        groupDynamics: "Lluvia de ideas inicial en pizarra: '¿Qué sientes cuando un estudiante entra en crisis frente a ti?'",
        reflectionQuestions: [
          "¿Por qué frases como 'no llores', 'cálmate que no es para tanto' o 'tienes que ser fuerte' suelen empeorar la crisis?",
          "¿Cuál es el valor del silencio empático en un momento de desborde?"
        ]
      },
      {
        number: 2,
        title: "Los 5 Principios Clave: Escuchar, Proteger, Consolar, Informar y Conectar",
        durationMinutes: 25,
        objective: "Aprender y memorizar el pentágono de contención de la OMS / Mineduc.",
        facilitatorScript: "Vamos a desglosar los cinco pilares de los PAP:\\n1. ESCUCHAR: Colócate a su misma altura física, haz contacto visual suave y valida su emoción con frases como: 'Estoy aquí contigo, estás a salvo'.\\n2. PROTEGER: Aparta al estudiante de miradas curiosas o del bullicio del patio. Llévalo a un lugar ventilado y tranquilo.\\n3. CONSOLAR: Ayúdale a regular su respiración. Invítale a beber un sorbo de agua a temperatura ambiente.\\n4. INFORMAR: Si hubo un rumor o accidente, explícale con palabras sencillas y certeras lo que está pasando, reduciendo la incertidumbre.\\n5. CONECTAR: No lo dejes solo. Comunícate de inmediato con el DECE y con su representante legal para generar la red protectora.",
        groupDynamics: "Exposición dialogada apoyada en el video guía y entrega de la Guía de Bolsillo para docentes.",
        materialsNeeded: ["Guía de Bolsillo PAP (Material descargable oficial)"]
      },
      {
        number: 3,
        title: "Simulación Práctica en Parejas: Casos de Descompensación en Aula",
        durationMinutes: 30,
        objective: "Entrenar la postura corporal, el tono de voz y las respuestas de contención ante una crisis simulada.",
        facilitatorScript: "Nos vamos a colocar en parejas (Docente A y Docente B). Docente A asumirá el rol de un estudiante de 14 años que acaba de recibir una noticia desgarradora y está hiperventilando en el pasillo. Docente B aplicará el protocolo de los 3 pasos: aproximarse sin invadir, pedir permiso para sentarse cerca, modular el tono de voz hacia uno grave y pausado, y guiar una respiración conjunta. Luego invertiremos los roles.",
        groupDynamics: "Juego de roles cruzado en parejas con retroalimentación del facilitador DECE.",
        reflectionQuestions: [
          "¿Cómo se sintió estar en el rol de la persona en crisis? ¿Qué actitudes del compañero te dieron calma real?",
          "¿Qué tan difícil fue controlar el impulso de dar consejos apresurados?"
        ]
      },
      {
        number: 4,
        title: "Técnicas de Enraizamiento: El Método Grounding 5-4-3-2-1",
        durationMinutes: 10,
        objective: "Aprender la herramienta más eficaz para reconectar la mente con los sentidos durante un ataque de pánico.",
        facilitatorScript: "Cuando una persona está en pánico, su cerebro está atrapado en un bucle de alerta. La técnica 5-4-3-2-1 la trae de vuelta al presente mediante los cinco sentidos:\\n- Nombra 5 cosas que puedas VER a tu alrededor.\\n- Nombra 4 cosas que puedas TOCAR (la textura de tu ropa, la mesa, tus manos).\\n- Nombra 3 cosas que puedas ESCUCHAR (el viento, mi voz, los pasos lejanos).\\n- Nombra 2 cosas que puedas OLER.\\n- Nombra 1 cosa que puedas SABOREAR o algo bueno de ti mismo.\\nVamos a practicarla todos juntos en este instante.",
        groupDynamics: "Ejercicio guiado grupal con las Tarjetas de Regulación Emocional.",
        materialsNeeded: ["Tarjetas Recortables de Grounding 5-4-3-2-1"]
      },
      {
        number: 5,
        title: "Cierre y Derivación Segura al DECE",
        durationMinutes: 10,
        objective: "Establecer con precisión el traspaso de información confidencial hacia el equipo del DECE.",
        facilitatorScript: "Una vez que el estudiante ha recuperado el ritmo respiratorio básico, el docente llena la Ficha Rápida de Notificación y lo acompaña con calidez a la oficina del DECE. Nunca enviamos al estudiante solo ni lo dejamos esperando en un pasillo. Colegas: su intervención oportuna marca la diferencia entre un trauma prolongado y una recuperación resiliente. ¡Muchas gracias por su entrega y vocación!",
        groupDynamics: "Entrega de ficha de compromisos y retroalimentación final."
      }
    ],
    downloadableMaterials: [
      {
        id: "guia-bolsillo-pap-docentes",
        title: "Guía de Bolsillo de Primeros Auxilios Psicológicos (Docentes)",
        description: "Formato tríptico/plegable de bolsillo con los 5 principios (Escuchar, Proteger, Consolar, Informar, Conectar), la tabla 'Qué hacer vs. Qué NO hacer' y el flujograma de notificación al DECE.",
        type: "GUIA_BOLSILLO",
        targetUser: "Docentes y Personal Administrativo",
        printInstructions: "Imprimir en papel bond a doble cara. Plegar en tres partes para llevar en el cuaderno de asistencia o bolsillo.",
        fileName: "Guia_Bolsillo_PAP_Docentes_SADEX.docx"
      },
      {
        id: "tarjetas-grounding-respiracion",
        title: "Tarjetas Recortables de Regulación Emocional (Grounding y Respiración)",
        description: "Contiene 4 tarjetas recortables con la técnica de respiración diafragmática 4-4-4-4 y la dinámica sensorial 5-4-3-2-1 para calmar crisis de pánico o ansiedad en el aula.",
        type: "RECORTABLE",
        targetUser: "Estudiantes y Docentes Tutores",
        printInstructions: "Imprimir en cartulina A4 a color o blanco y negro. Recortar por los bordes punteados para repartir en aula o tener en el rincón de calma.",
        fileName: "Tarjetas_Recortables_Grounding_Respiracion_SADEX.docx"
      }
    ]
  },
  {
    id: "autoestima-ninos-10-anos",
    slug: "autoestima-ninos-10-anos",
    title: "Taller Lúdico de Autoestima: 'El Jardín de Mis Fortalezas y Superpoderes'",
    subtitle: "Desarrollo de una autoimagen positiva, reconocimiento de cualidades personales y compañerismo en niñas y niños.",
    category: "DESARROLLO_SOCIOEMOCIONAL",
    categoryLabel: "Desarrollo Socioemocional Infantil",
    normativeBase: "Acuerdo MINEDUC-044-A (Educación Socioemocional) & LOEI Art. 73",
    targetAudiences: ["ESTUDIANTES_PRIMARIA", "DOCENTES"],
    targetAudienceLabel: "Estudiantes de 8 a 11 años (Básica Elemental y Media)",
    estimatedDuration: "60 minutos",
    relatedActionPlanTopic: "SOCIOEMOCIONAL",
    generalObjective: "Favorecer la construcción de una sana autoestima en niñas y niños mediante dinámicas lúdicas, cuentos interactivos y actividades manuales que les permitan identificar y celebrar sus propias fortalezas y las de sus pares.",
    specificObjectives: [
      "Comprender qué es la autoestima y cómo influyen las palabras positivas en nuestro bienestar.",
      "Identificar cualidades, talentos y valores individuales mediante una flor recortable de fortalezas.",
      "Fortalecer el respeto y la convivencia armónica entre compañeros de grado.",
      "Generar compromisos personales de buen trato y autocuidado diario."
    ],
    materialsGeneral: [
      "Globos de colores y marcadores",
      "Fichas recortables 'Mi Flor de Fortalezas' impresas",
      "Tijeras infantiles y barras de pegamento",
      "Lápices de colores y crayones"
    ],
    preliminaryNotes: "Se recomienda que el facilitador use un tono entusiasta, lúdico y cercano. En caso de que algún niño manifieste dificultad para encontrar cosas positivas sobre sí mismo, el facilitador o sus compañeros pueden regalarle palabras de aprecio genuino.",
    phases: [
      {
        number: 1,
        title: "Bienvenida y Dinámica: 'El Globo de la Autoestima'",
        durationMinutes: 15,
        objective: "Visualizar de forma concreta cómo las palabras inflan o desinflan nuestro ánimo.",
        facilitatorScript: "¡Hola a todas y todos, campeones! ¿Quién de ustedes sabe qué es la autoestima?\\n(Los niños responden libremente).\\n¡Excelente! La autoestima es el amor y respeto que sentimos por nosotros mismos: es saber que somos personas únicas, valiosas e irrepetibles.\\n\\nHoy tengo un globo en mis manos. Cuando en casa o en la escuela nos dicen cosas bonitas o reconocemos nuestros logros, nuestro globo se infla grande y brillante. Pero cuando alguien nos ofende o nosotros mismos nos tratamos mal, el globo se desinfla un poquito. Vamos a inflar nuestro propio globo y escribiremos en él una palabra que nos haga sentir súper felices con nosotros mismos.",
        groupDynamics: "Cada niño recibe un globo y marcador para escribir su cualidad principal. Se comparte en voz alta.",
        materialsNeeded: ["Globos de colores", "Marcadores"]
      },
      {
        number: 2,
        title: "Cuento Interactivo: 'El Jardín de los Árboles Diferentes'",
        durationMinutes: 15,
        objective: "Enseñar que la diversidad de talentos es lo que hace hermoso a un grupo.",
        facilitatorScript: "Había una vez un jardín encantado donde todos los árboles querían ser iguales: el roble quería dar manzanas como el manzano, y el manzano quería dar rosas rojas como el rosal. Todos estaban tristes porque no apreciaban lo que tenían dentro. Hasta que llegó un búho sabio y les dijo: 'Tú no puedes dar manzanas porque eres un roble fuerte que da sombra maravillosa a los pájaros; y tú, manzano, alimentas con fruta deliciosa. Cada uno tiene su propia magia y propósito'. Desde ese día, el jardín floreció lleno de alegría.",
        groupDynamics: "Narración animada del cuento con preguntas participativas.",
        reflectionQuestions: [
          "¿Por qué es aburrido que todos seamos iguales?",
          "¿Cuál es el superpoder o talento especial que te hace único en tu grado?"
        ]
      },
      {
        number: 3,
        title: "Actividad Manual y Recortable: 'Mi Flor de Fortalezas'",
        durationMinutes: 20,
        objective: "Elaborar una manualidad personalizada que el niño conserve como recordatorio de su valía.",
        facilitatorScript: "¡Ahora manos a la obra! A cada uno le voy a entregar su ficha de 'Mi Flor de Fortalezas'. En el centro de la flor van a dibujar su carita sonriente. En cada uno de los pétalos recortables van a escribir o dibujar cosas maravillosas de ustedes:\\n- Pétalo 1: Algo en lo que soy genial.\\n- Pétalo 2: Un buen acto que hice por alguien.\\n- Pétalo 3: Algo que me hace sonreír.\\n- Pétalo 4: Un sueño que quiero cumplir.\\nLuego recortamos los pétalos y armamos nuestra flor decorada con colores hermosos.",
        groupDynamics: "Trabajo manual en pupitres con tijeras escolares y pegamento. El facilitador y el docente recorren el aula reforzando a los niños.",
        materialsNeeded: ["Ficha Recortable 'Mi Flor de Fortalezas' (Material descargable)", "Tijeras", "Pegamento", "Colores"]
      },
      {
        number: 4,
        title: "Galería de Flores y Compromiso de Cierre",
        durationMinutes: 10,
        objective: "Celebrar los trabajos de todos y fijar el compromiso del buen trato.",
        facilitatorScript: "Vamos a levantar todos nuestra flor de fortalezas bien alto. Miren qué hermoso jardín hemos formado hoy. Ninguna flor es mejor que otra: todas son especiales. Vamos a repetir juntos nuestro juramento del superhéroe del buen trato:\\n'Yo soy importante, yo soy valioso, y me comprometo a tratarme con amor a mí mismo y a cuidar el corazón de mis compañeros'.\\n¡Un fuertísimo aplauso para todas y todos!",
        groupDynamics: "Exposición colectiva de las flores en un mural del aula y entrega de las tarjetas coleccionables de afirmaciones.",
        materialsNeeded: ["Tarjetas Coleccionables de Afirmaciones Positivas"]
      }
    ],
    downloadableMaterials: [
      {
        id: "ficha-flor-fortalezas",
        title: "Ficha Didáctica Recortable: 'Mi Flor de Fortalezas'",
        description: "Lámina imprimible en blanco y negro con la silueta de un tallo, hojas y 6 pétalos de líneas punteadas para recortar y colorear. Cada pétalo contiene un disparador positivo para que el estudiante complete.",
        type: "RECORTABLE",
        targetUser: "Niñas y niños de 8 a 11 años",
        printInstructions: "Imprimir en hoja A4 (papel bond o cartulina). Repartir una hoja por estudiante junto con tijeras punta roma y pegamento.",
        fileName: "Ficha_Recortable_Flor_Fortalezas_Autoestima_SADEX.docx"
      },
      {
        id: "tarjetas-afirmaciones-positivas",
        title: "Tarjetas Coleccionables de Afirmaciones (Superpoderes Emocionales)",
        description: "Set de 8 tarjetas coleccionables recortables con frases de empoderamiento (ej: 'Soy valiente ante los retos', 'Mi voz merece ser escuchada', 'Mis errores me ayudan a aprender').",
        type: "RECORTABLE",
        targetUser: "Estudiantes de Primaria",
        printInstructions: "Imprimir a color o en blanco y negro para pintar. Recortar por los bordes para entregar como incentivo al final del taller.",
        fileName: "Tarjetas_Coleccionables_Afirmaciones_Positivas_SADEX.docx"
      }
    ]
  },
  {
    id: "formacion-profesionales-dece",
    slug: "formacion-profesionales-dece",
    title: "Taller para Equipos DECE: Enfoque de Derechos, Pobreza Infantil y Determinantes Sociales",
    subtitle: "Herramientas de análisis contextual, interseccionalidad y dinámicas no verbales para la intervención psicosocial.",
    category: "FORMACION_DECE",
    categoryLabel: "Formación Técnica para Profesionales DECE",
    normativeBase: "Estatuto Orgánico de Gestión Organizacional DECE & LOEI",
    targetAudiences: ["PROFESIONALES_DECE", "DOCENTES"],
    targetAudienceLabel: "Profesionales DECE, Directivos y Docentes Mentores",
    estimatedDuration: "120 minutos",
    relatedActionPlanTopic: "CAPACITACION_DOCENTE",
    generalObjective: "Fortalecer las capacidades técnicas de los profesionales DECE en el análisis crítico de la pobreza infantil y las brechas estructurales de género y territorio, incorporando metodologías activas y no verbales para el diagnóstico e intervención en la comunidad escolar.",
    specificObjectives: [
      "Analizar los datos actualizados y el impacto multidimensional de la pobreza infantil en el desarrollo integral y permanencia escolar.",
      "Ejecutar la dinámica vivencial 'El Contexto es mucho texto' para visibilizar barreras socioeconómicas sin utilizar la palabra hablada.",
      "Identificar roles de género impuestos (cuidado doméstico en niñas y adolescentes) que generan ausentismo o deserción.",
      "Diseñar estrategias institucionales afirmativas de acompañamiento psicosocial contextualizado a la realidad territorial."
    ],
    materialsGeneral: [
      "Presentación institucional en diapositivas",
      "Matriz de análisis contextual y fichas de debate",
      "Tarjetas con roles y situaciones socioeconómicas invisibles",
      "Papelógrafos y marcadores para conclusiones técnicas"
    ],
    preliminaryNotes: "Taller de nivel técnico superior diseñado para jornadas pedagógicas de autoevaluación institucional, reuniones de red DECE de circuito o talleres distritales.",
    phases: [
      {
        number: 1,
        title: "Apertura y Diagnóstico: Pobreza Infantil Multidimensional en Ecuador",
        durationMinutes: 30,
        objective: "Contextualizar los factores de vulnerabilidad que impactan el aprendizaje y la salud mental.",
        facilitatorScript: "Colegas del Departamento de Consejería Estudiantil: Cuando un estudiante llega tarde, no presenta una tarea o muestra retraimiento, muchas veces la institución tiende a etiquetarlo bajo una mirada punitiva o meramente conductual.\\n\\nSin embargo, la realidad de nuestros territorios nos muestra que los niños y adolescentes en situación de pobreza enfrentan privaciones severas no solo materiales, sino de tiempo, nutrición y soporte afectivo. Las niñas, por ejemplo, asumen tempranamente el rol machista de cuidadoras de hermanos menores mientras las madres salen a trabajar en la informalidad, lo cual compromete directamente su permanencia escolar. Como DECE, nuestra mirada técnica debe trascender el síntoma y comprender la raíz estructural del contexto.",
        groupDynamics: "Presentación de datos y debate introductorio sobre las realidades de la institución.",
        reflectionQuestions: [
          "¿Cómo influyen las condiciones socioeconómicas del barrio o cantón en las alertas que recibimos a diario?",
          "¿De qué manera evitamos revictimizar a los hogares en situación de vulnerabilidad extrema?"
        ]
      },
      {
        number: 2,
        title: "Dinámica Central: 'El Contexto es mucho texto' (Ejercicio No Verbal)",
        durationMinutes: 40,
        objective: "Vivenciar las brechas de acceso y las diferencias sociales sin recurrir al lenguaje oral.",
        facilitatorScript: "Vamos a realizar el ejercicio 'El Contexto es mucho texto'. A cada grupo se le asignará una situación de vida real: 1) Estudiante con doble jornada laboral y escolar; 2) Adolescente a cargo del cuidado de adultos mayores; 3) Estudiante sin conectividad ni luz eléctrica; 4) Estudiante de familia con estabilidad económica.\\n\\nCada grupo deberá representar su realidad ante la plenaria SIN PRONUNCIAR UNA SOLA PALABRA, utilizando únicamente expresión corporal, silencios y objetos del entorno. Los demás grupos deberán decodificar las barreras invisibles que experimenta esa persona.",
        groupDynamics: "Dramatización no verbal en subgrupos con análisis posterior.",
        materialsNeeded: ["Fichas de Situaciones Contextuales (Material descargable oficial)"]
      },
      {
        number: 3,
        title: "Mesa Técnica: Construcción de la Matriz de Vulnerabilidad Territorial",
        durationMinutes: 35,
        objective: "Articular planes de acompañamiento con enfoque de equidad e inclusión.",
        facilitatorScript: "Utilizando la Matriz de Diagnóstico Contextual que tienen en sus manos, vamos a mapear en equipos cuáles son los 3 factores de riesgo territorial más agudos de nuestra comunidad escolar (ej. consumo de sustancias en los alrededores, trabajo infantil informal, desestructuración familiar por migración). Para cada factor, plantearemos una acción de protección DECE que involucre a los docentes y a las redes interinstitucionales.",
        groupDynamics: "Trabajo en mesas técnicas interdisciplinarias.",
        materialsNeeded: ["Matriz de Diagnóstico Contextual DECE"]
      },
      {
        number: 4,
        title: "Plenaria, Acuerdos y Vinculación con el Plan de Acción (POA)",
        durationMinutes: 15,
        objective: "Consolidar las conclusiones e incorporarlas a los compromisos de gestión institucional.",
        facilitatorScript: "Las reflexiones vertidas hoy demuestran la solidez de nuestro rol técnico. No somos observadores pasivos: el DECE es el puente que garantiza que el derecho a la educación se cumpla en condiciones de dignidad. Los compromisos generados hoy se incorporarán de forma tangible en nuestro Plan de Acción Anual institucional.",
        groupDynamics: "Lectura de actas y compromisos finales."
      }
    ],
    downloadableMaterials: [
      {
        id: "matriz-analisis-contexto-dece",
        title: "Matriz de Diagnóstico Contextual y Preguntas de Debate DECE",
        description: "Documento de trabajo para profesionales DECE que incluye la rúbrica de análisis de brechas de género, roles de cuidado, determinantes socioeconómicos y las 4 fichas de situaciones para la dinámica 'El Contexto es mucho texto'.",
        type: "MATRIZ_ANALISIS",
        targetUser: "Profesionales DECE y Directivos",
        printInstructions: "Imprimir en hojas A4 para repartir una matriz por mesa de trabajo técnico.",
        fileName: "Matriz_Analisis_Contextual_Pobreza_Infantil_DECE_SADEX.docx"
      }
    ]
  },

  // --- TALLERES LOTE 2 (2024 - 2025) ---

  // 5. Estilos de Crianza y Corresponsabilidad
  {
    id: "estilos-crianza-corresponsabilidad",
    slug: "estilos-crianza-corresponsabilidad",
    title: "Taller para Familias y Docentes: 'Jugando a Criar y Colaborar'",
    subtitle: "Reflexión sobre los 4 estilos de crianza, límites con afecto y corresponsabilidad entre el hogar y la escuela.",
    category: "PREVENCION_044A",
    categoryLabel: "Escuela para Familias (044-A)",
    normativeBase: "Acuerdo Ministerial MINEDUC-044-A (Temática 5) & LOEI Art. 73",
    targetAudiences: ["FAMILIAS", "DOCENTES", "COMUNIDAD_EDUCATIVA"],
    targetAudienceLabel: "Padres, Madres, Representantes Legales y Personal Docente",
    estimatedDuration: "60 minutos",
    relatedActionPlanTopic: "VINCULO_FAMILIAS",
    generalObjective: "Propiciar un espacio lúdico y reflexivo para que las familias y docentes identifiquen los estilos de crianza predominantes y fortalezcan la corresponsabilidad en el acompañamiento académico y socioemocional de niñas, niños y adolescentes.",
    specificObjectives: [
      "Diferenciar las características y consecuencias formativas de los 4 estilos de crianza: Autoritario, Permisivo, Democrático/Asertivo y Negligente.",
      "Comprender la corresponsabilidad familia-escuela como una alianza protectora indispensable.",
      "Brindar pautas prácticas para establecer normas claras con afecto y comunicación asertiva en el hogar.",
      "Construir acuerdos y compromisos mutuos plasmados en el Árbol de la Corresponsabilidad."
    ],
    materialsGeneral: [
      "Cartones impresos del Bingo de Estilos de Crianza",
      "Fichas para marcar o semillas/botones",
      "Palitos de helado o bloques de construcción para la torre",
      "Papelógrafos, marcadores y notas adhesivas de colores"
    ],
    preliminaryNotes: "Crear un clima de empatía y cero juzgamiento. Ninguna familia es perfecta; el objetivo es brindar herramientas prácticas de crianza positiva y no culpabilizar a los padres.",
    phases: [
      {
        number: 1,
        title: "Bienvenida y Dinámica: 'El Círculo de las Emociones Familiares'",
        durationMinutes: 10,
        objective: "Romper el hielo y validar las emociones vinculadas al rol de educar y criar.",
        facilitatorScript: "¡Buenas tardes a todas las mamás, papás y docentes presentes! Sean muy bienvenidos a este taller 'Jugando a Criar y Colaborar'.\\n\\nEducar y criar a un hijo o hija en los tiempos actuales es una de las tareas más hermosas, pero también una de las más desafiantes. A veces sentimos orgullo, otras cansancio, dudas o preocupación. En este círculo, todas las emociones son válidas. Vamos a compartir una sola palabra que describa cómo nos sentimos hoy frente al reto de acompañar el crecimiento de nuestros hijos.",
        groupDynamics: "Ronda rápida en círculo compartiendo una emoción y encuadre de respeto.",
        reflectionQuestions: [
          "¿Por qué es importante reconocer que la crianza no viene con un manual perfecto?",
          "¿Cómo influye nuestro estado de ánimo en la forma en que respondemos a nuestros hijos?"
        ]
      },
      {
        number: 2,
        title: "Dinámica Central: 'El Bingo de los Estilos de Crianza'",
        durationMinutes: 20,
        objective: "Identificar vivencialmente los estilos autoritario, permisivo, democrático y negligente.",
        facilitatorScript: "A cada participante le hemos entregado un cartón del 'Bingo de Estilos de Crianza'. Yo leeré situaciones de la vida cotidiana (ej: 'El hijo pide permiso para llegar tarde y el padre responde: ¡Aquí se hace lo que yo digo y punto!'; o 'La madre deja que la niña juegue en el celular hasta la madrugada porque no quiere escuchar berrinches').\\n\\nUstedes buscarán en su cartón a qué estilo corresponde esa conducta y colocarán una ficha. Quien complete una línea gritará ¡BINGO! y analizaremos juntos qué mensaje transmite ese estilo al corazón del niño.",
        groupDynamics: "Juego grupal de Bingo con tarjetas recortables de situaciones familiares.",
        materialsNeeded: ["Cartones de Bingo de Estilos de Crianza (Material recortable descargable)"]
      },
      {
        number: 3,
        title: "Actividad en Equipos: 'La Torre de la Corresponsabilidad'",
        durationMinutes: 20,
        objective: "Visualizar el equilibrio necesario entre la escuela y el hogar para sostener el desarrollo del estudiante.",
        facilitatorScript: "Nos dividiremos en equipos mixtos de docentes y familias. Cada mesa recibirá palitos y bloques. El reto es construir la torre más alta y firme posible, pero con una regla:\\n- Cada piso debe construirse alternando un bloque colocado por la familia y un bloque colocado por el docente.\\nSi uno de los dos lados deja de colocar su parte o suelta la estructura, la torre tambalea y cae. Así de vital es el trabajo conjunto entre la casa y el colegio.",
        groupDynamics: "Construcción cooperativa en mesas mixtas con reflexión sobre el apoyo mutuo.",
        reflectionQuestions: [
          "¿Qué pasa en la vida de un estudiante cuando la familia y el colegio no jalan para el mismo lado?",
          "¿Qué compromisos concretos podemos asumir ambas partes a partir de hoy?"
        ]
      },
      {
        number: 4,
        title: "Cierre: 'El Árbol de los Compromisos de Corresponsabilidad'",
        durationMinutes: 10,
        objective: "Formalizar acuerdos tangibles de buen trato y apoyo mutuo.",
        facilitatorScript: "Para cerrar, cada familia y docente escribirá en una hoja adhesiva un compromiso concreto (ej: 'Dedicar 15 minutos diarios a conversar sin pantallas con mi hijo', 'Revisar la libreta con palabras de aliento y no con gritos'). Pegaremos nuestras hojas en el árbol mural del aula como testimonio de nuestra alianza protectora. ¡Muchas gracias por su amor y compromiso!",
        groupDynamics: "Firma y pegado de compromisos en el mural institucional."
      }
    ],
    downloadableMaterials: [
      {
        id: "bingo-estilos-crianza",
        title: "Cartones de Bingo de Estilos de Crianza (Recortables)",
        description: "Set de 4 cartones de bingo diferentes con casilleros punteados para recortar. Incluye la guía del facilitador con las 16 situaciones cotidianas de estilos autoritario, permisivo, negligente y democrático/asertivo.",
        type: "RECORTABLE",
        targetUser: "Familias y Docentes",
        printInstructions: "Imprimir en hojas A4 (cartulina o papel bond). Recortar los cartones individuales y repartir a los participantes.",
        fileName: "Bingo_Estilos_Crianza_Familias_SADEX.docx"
      },
      {
        id: "acuerdos-corresponsabilidad",
        title: "Ficha de Compromisos y Acuerdos de Corresponsabilidad",
        description: "Formato oficial para plasmar acuerdos entre la institución y las familias: responsabilidades del hogar, compromisos del docente tutor y seguimiento del DECE.",
        type: "FICHA_TRABAJO",
        targetUser: "Representantes Legales y Docentes Tutores",
        printInstructions: "Imprimir a doble cara. Archivar una copia firmada en la carpeta del tutor y entregar otra a la familia.",
        fileName: "Ficha_Acuerdos_Corresponsabilidad_Familia_SADEX.docx"
      }
    ]
  },

  // 6. OVP: Triatlón Académico
  {
    id: "ovp-triatlon-academico",
    slug: "ovp-triatlon-academico",
    title: "Feria Lúdica OVP: 'Triatlón Académico de Proyectos de Vida'",
    subtitle: "Circuito vivencial de exploración vocacional para la elección del Bachillerato en Ciencias, Mecánica y Contabilidad.",
    category: "DESARROLLO_SOCIOEMOCIONAL",
    categoryLabel: "Orientación Vocacional y Profesional (OVP)",
    normativeBase: "Lineamientos de OVP MINEDUC & LOEI Art. 73",
    targetAudiences: ["ESTUDIANTES_SECUNDARIA", "DOCENTES"],
    targetAudienceLabel: "Estudiantes de 9no y 10mo EGB (13 a 15 años) y Docentes de Bachillerato",
    estimatedDuration: "90 minutos",
    relatedActionPlanTopic: "OVP",
    generalObjective: "Facilitar un circuito de estaciones interactivas de corta duración para que las y los estudiantes de Básica Superior experimenten de forma práctica las habilidades y perfiles de egreso de las ofertas de Bachillerato.",
    specificObjectives: [
      "Explorar de manera práctica y dinámica las competencias de Ciencias, Mecanizado Técnico y Servicios Contables.",
      "Identificar intereses, habilidades y afinidades personales mediante desafíos vivenciales de 10 minutos.",
      "Registrar el aprendizaje vocacional en el Pasaporte del Triatlón Académico.",
      "Articular los resultados del circuito con la toma de decisión informada para el ingreso a 1ro BGU."
    ],
    materialsGeneral: [
      "Pasaportes impresos del Triatlón Académico para sellar",
      "Sellos o stickers para cada estación",
      "Insumos de estación de Ciencias (vasos, vinagre, bicarbonato, muestras de laboratorio)",
      "Insumos de estación de Mecánica (mini ensambles, tuercas, rompecabezas mecánicos)",
      "Insumos de estación de Contabilidad (tarjetas de presupuesto, calculadoras, billetes didácticos)"
    ],
    preliminaryNotes: "La feria se organiza en tres estaciones físicas simultáneas. Los estudiantes rotan en grupos pequeños para que todos vivan la experiencia en primera persona.",
    phases: [
      {
        number: 1,
        title: "Apertura y Entrega del Pasaporte Vocacional",
        durationMinutes: 10,
        objective: "Presentar la lógica del Triatlón y motivar la exploración sin estereotipos de género.",
        facilitatorScript: "¡Bienvenidos al Triatlón Académico! Están a punto de dar un paso emocionante en su vida escolar: elegir la especialidad de Bachillerato que mejor se conecte con sus sueños y talentos.\\n\\nHoy no venimos a escuchar charlas aburridas; venimos a experimentar con nuestras propias manos. A cada uno le entregamos su 'Pasaporte del Triatlón'. Deberán recorrer las 3 estaciones, superar los retos prácticos y obtener los sellos correspondientes. ¡Atrévanse a descubrir talentos que tal vez no sabían que tenían!",
        groupDynamics: "Organización en escuadras de rotación y entrega de cartillas.",
        materialsNeeded: ["Pasaporte del Triatlón Académico (Material descargable oficial)"]
      },
      {
        number: 2,
        title: "Estación 1: 'Exploradores de la Ciencia' (Bachillerato en Ciencias)",
        durationMinutes: 20,
        objective: "Experimentar el método científico, la curiosidad analítica y la investigación del mundo natural.",
        facilitatorScript: "En esta estación son científicos investigadores. Van a realizar un experimento químico controlado de reacción efervescente y observarán al microscopio la estructura celular vegetal. El Bachillerato en Ciencias potencia su curiosidad, su pensamiento lógico y abre puertas hacia carreras de medicina, biotecnología, ingenierías y ciencias sociales.",
        groupDynamics: "Reto de laboratorio en mesas con reactivos seguros y registro de observaciones."
      },
      {
        number: 3,
        title: "Estación 2: 'Desafío de Ensamblaje y Precisión' (Bachillerato Técnico en Mecanizado)",
        durationMinutes: 20,
        objective: "Explorar destrezas visoespaciales, ensamble técnico y resolución mecánica de problemas.",
        facilitatorScript: "¡Bienvenidos al taller técnico! Su misión es ensamblar contra reloj un componente mecánico utilizando herramientas y esquemas de diseño. El Bachillerato Técnico en Mecanizado forma profesionales altamente demandados en la industria productiva, automatización, diseño computarizado y robótica.",
        groupDynamics: "Desafío de armado por piezas y verificación de precisión de medidas."
      },
      {
        number: 4,
        title: "Estación 3: 'El Reto del Presupuesto Estratégico' (Bachillerato en Contabilidad)",
        durationMinutes: 20,
        objective: "Desarrollar criterio financiero, gestión de recursos y toma de decisiones económicas.",
        facilitatorScript: "En esta estación ustedes son los gerentes financieros de un emprendimiento juvenil. Tienen un capital inicial y deben equilibrar costos, gastos e ingresos para que el proyecto sea rentable y éticamente responsable. La Contabilidad y Administración desarrollan su visión estratégica de negocios y gestión empresarial.",
        groupDynamics: "Juego de simulación presupuestaria con tarjetas de balance."
      },
      {
        number: 5,
        title: "Plenaria y Registro de Preferencias Vocacionales",
        durationMinutes: 20,
        objective: "Consolidar el pasaporte con los 3 sellos y plasmar la autoevaluación en la matriz DECE.",
        facilitatorScript: "¡Felicidades a todos los finalistas del Triatlón! Miren sus pasaportes con los 3 sellos completados. Ahora respondan con sinceridad en su cartilla: ¿Cuál estación les hizo perder la noción del tiempo? ¿En cuál sintieron mayor entusiasmo? Estos indicios son la brújula de su Proyecto de Vida. ¡El equipo DECE estará acompañándolos en cada paso de su elección!",
        groupDynamics: "Cierre festivo, retroalimentación y entrega de incentivos."
      }
    ],
    downloadableMaterials: [
      {
        id: "pasaporte-triatlon-ovp",
        title: "Pasaporte Recortable del Triatlón Académico (Cartilla de Estaciones)",
        description: "Cartilla plegable imprimible tamaño A4 con casilleros para sellos de Ciencias, Mecánica y Contabilidad, rúbrica de autoevaluación de intereses y cuestionario de toma de decisión para el estudiante.",
        type: "RECORTABLE",
        targetUser: "Estudiantes de 9no y 10mo EGB",
        printInstructions: "Imprimir en cartulina blanca A4 (o papel bond grueso). Plegar por la mitad para formar el cuadernillo pasaporte.",
        fileName: "Pasaporte_Triatlon_Academico_OVP_SADEX.docx"
      }
    ]
  },

  // 7. Taller Infantil (4 años): "Yo tengo derecho a ser bien tratado"
  {
    id: "autoproteccion-infantil-4-anos",
    slug: "autoproteccion-infantil-4-anos",
    title: "Taller Infantil de Autoprotección: 'Yo tengo derecho a ser bien tratado'",
    subtitle: "Prevención del maltrato institucional y fortalecimiento de la confianza en niñas y niños de Educación Inicial.",
    category: "PREVENCION_044A",
    categoryLabel: "Prevención Acuerdo 044-A (Primera Infancia)",
    normativeBase: "Acuerdo Ministerial MINEDUC-044-A (Prevención de Violencias) & LOEI Art. 73",
    targetAudiences: ["ESTUDIANTES_PRIMARIA", "DOCENTES"],
    targetAudienceLabel: "Niñas y niños de 4 a 6 años (Educación Inicial 2 y 1ro EGB) y Docentes Parvularias",
    estimatedDuration: "60 minutos",
    relatedActionPlanTopic: "VIOLENCIA",
    generalObjective: "Prevenir y detectar oportunamente situaciones de maltrato físico y psicológico mediante dinámicas lúdicas que fomenten el reconocimiento de emociones, la autoprotección y la confianza para expresar cuando algo les genera miedo o tristeza.",
    specificObjectives: [
      "Reconocer las emociones básicas de alegría, miedo, tristeza y enojo a través de títeres y cuentos.",
      "Identificar conductas de adultos que cruzan límites respetuosos (gritos, castigos físicos, humillaciones).",
      "Entrenar la respuesta asertiva '¡No me gusta, alto!' y la búsqueda de personas protectoras.",
      "Construir un clima escolar seguro sustentado en el buen trato recíproco."
    ],
    materialsGeneral: [
      "Títere de Nico o muñeco de tela",
      "Fichas recortables del Semáforo del Buen Trato",
      "Medallas recortables para colorear",
      "Crayones gruesos, tijeras punta roma y lanas para colgar medallas"
    ],
    preliminaryNotes: "Las actividades deben desarrollarse en alfombra o tapete infantil en un ambiente cálido y lúdico. La profesional DECE debe observar con atención gestos de retraimiento o reacciones emocionales de los niños.",
    phases: [
      {
        number: 1,
        title: "Bienvenida y Ronda Afectiva: 'Mi Nombre Brilla'",
        durationMinutes: 10,
        objective: "Afianzar la identidad, el sentido de valía y el clima de calidez.",
        facilitatorScript: "¡Hola mis pequeños soles! Bienvenidos a nuestro círculo mágico. Hoy vamos a cantar nuestra canción de los nombres. Cuando diga tu nombre, vas a dar un aplauso fuerte y todos te diremos: '¡Tu nombre brilla con luz hermosa!'. Porque cada uno de ustedes es un tesoro valioso que merece amor y sonrisas todos los días.",
        groupDynamics: "Canción de bienvenida con palmas y contacto visual afectivo."
      },
      {
        number: 2,
        title: "Cuento con Títere: 'Nico y la Voz Fuerte'",
        durationMinutes: 15,
        objective: "Reconocer que los gritos y tratos bruscos no son normales ni aceptables.",
        facilitatorScript: "(Con títere en mano) Este es Nico. A Nico le encanta pintar dinosaurios. Pero un día, un adulto le gritó muy fuerte y lo zamarreó porque se le cayó una tempera al piso. Nico sintió que su corazoncito latía muy rápido como un tambor y le dieron ganas de llorar. Nico se preguntó: ¿Hice algo malo para que me traten así? ¿Ustedes qué opinan, amiguitos? Cuando nos equivocamos, ¿nos deben gritar o nos deben enseñar con paciencia?",
        groupDynamics: "Interacción guiada con el títere y preguntas de empatía infantil.",
        reflectionQuestions: [
          "¿Cómo se pone tu carita cuando alguien te grita muy fuerte?",
          "¿A quién puedes acudir en la escuela si una persona te hace sentir miedo?"
        ]
      },
      {
        number: 3,
        title: "Juego Dinámico: 'Sí me gusta / No me gusta'",
        durationMinutes: 10,
        objective: "Diferenciar tratos respetuosos de agresiones físicas o verbales.",
        facilitatorScript: "Nos ponemos de pie. Cuando yo diga algo bonito (ej: 'Un abrazo suave de buenos días', 'Felicitarte cuando intentas algo', 'Prestarte un juguete'), vamos a saltar de alegría con las manos arriba. Pero si digo algo que hace daño (ej: 'Un pellizco', 'Un grito feo', 'Un jalón de orejas', 'Encerrar en el baño'), cruzamos los brazos, damos un paso atrás y decimos bien fuerte: '¡NO ME GUSTA!'.",
        groupDynamics: "Juego psicomotor de diferenciación corporal de límites."
      },
      {
        number: 4,
        title: "Actividad Manual y Recortable: 'El Semáforo del Buen Trato'",
        durationMinutes: 15,
        objective: "Plasmar en un semáforo didáctico las acciones que protegen el bienestar infantil.",
        facilitatorScript: "Vamos a pintar nuestro Semáforo del Buen Trato:\\n- Círculo VERDE: Cosas que nos hacen sonreír (abrazos, cuentos, juegos).\\n- Círculo AMARILLO: Cosas que nos confunden y debemos preguntar a un adulto de confianza.\\n- Círculo ROJO: Cosas que NADIE puede hacernos (golpes, tocar nuestro cuerpo sin permiso, secretos que duelen). Recortamos las manitos y armamos nuestro semáforo protector.",
        groupDynamics: "Coloreado y recorte con apoyo de docentes parvularias.",
        materialsNeeded: ["Ficha del Semáforo del Buen Trato (Material descargable oficial)"]
      },
      {
        number: 5,
        title: "Coronación: 'Medalla del Campeón del Buen Trato'",
        durationMinutes: 10,
        objective: "Fijar el compromiso institucional de protección infantil.",
        facilitatorScript: "A cada una y uno de ustedes les entregamos su Medalla de 'Campeón y Defensor del Buen Trato'. Recuerden siempre: ¡Ustedes tienen derecho a ser felices, a jugar y a que todos los adultos los cuiden con cariño y respeto!",
        groupDynamics: "Colocación de medallas y abrazo grupal con canción de cierre.",
        materialsNeeded: ["Medallas Recortables 'Defensor del Buen Trato'"]
      }
    ],
    downloadableMaterials: [
      {
        id: "semaforo-buen-trato-recortable",
        title: "Ficha Recortable: 'El Semáforo del Buen Trato Infantil'",
        description: "Lámina ilustrada en blanco y negro con la silueta de un semáforo grande y 6 figuras recortables (manos de caricias, libros, signos de alto) para clasificar lo que sí está permitido y lo que nunca debe tolerarse en el aula.",
        type: "RECORTABLE",
        targetUser: "Niños de Educación Inicial y 1ro EGB",
        printInstructions: "Imprimir en hoja bond A4 para que los niños pinten con crayones y peguen con pegamento escolar.",
        fileName: "Ficha_Recortable_Semaforo_Buen_Trato_SADEX.docx"
      },
      {
        id: "medallas-campeon-buen-trato",
        title: "Medallas Recortables: 'Defensor del Buen Trato'",
        description: "Plancha con 6 medallas circulares recortables listas para pintar, perforar en la parte superior y colocar una lana para que los niños las lleven puestas a casa.",
        type: "RECORTABLE",
        targetUser: "Estudiantes de Educación Inicial",
        printInstructions: "Imprimir en cartulina blanca A4. Recortar por los círculos punteados.",
        fileName: "Medallas_Recortables_Buen_Trato_Infantil_SADEX.docx"
      }
    ]
  },

  // 8. Riesgos Psicosociales, Salud Mental y Epilepsia en el Aula
  {
    id: "riesgos-psicosociales-epilepsia",
    slug: "riesgos-psicosociales-epilepsia",
    title: "Taller para Docentes: 'Detección Temprana de Riesgos y Primeros Auxilios ante Crisis Epilépticas'",
    subtitle: "Herramientas de aula para identificar ansiedad, depresión y riesgo suicida, y protocolo médico ante crisis convulsivas.",
    category: "PRIMEROS_AUXILIOS_PAP",
    categoryLabel: "Salud Mental y Emergencias en Aula",
    normativeBase: "Protocolos Intersectoriales MINEDUC - MSP & LOEI Art. 73",
    targetAudiences: ["DOCENTES", "PROFESIONALES_DECE", "COMUNIDAD_EDUCATIVA"],
    targetAudienceLabel: "Personal Docente, Inspectores y Autoridades Institucionales",
    estimatedDuration: "90 minutos",
    relatedActionPlanTopic: "SALUD_MENTAL",
    generalObjective: "Capacitar al personal docente en la detección temprana de indicadores de ansiedad, depresión y riesgo suicida en estudiantes, dotándolos simultáneamente del protocolo oficial de primeros auxilios ante crisis epilépticas o convulsivas en el entorno escolar.",
    specificObjectives: [
      "Identificar los signos tempranos de trastornos de ansiedad y cuadros depresivos que se manifiestan en el rendimiento y conducta escolar.",
      "Reconocer las manifestaciones clínicas de una crisis epiléptica (tónico-clónica, ausencias) desmitificando creencias populares peligrosas.",
      "Entrenar el paso a paso de primeros auxilios ante convulsiones: proteger la cabeza, posición lateral de seguridad y control del tiempo.",
      "Aplicar el protocolo de las 10 situaciones de alerta psicosocial mediante tarjetas de análisis en subgrupos."
    ],
    materialsGeneral: [
      "Tarjetas de las 10 situaciones de alerta impresas",
      "Guía de bolsillo de primeros auxilios en epilepsia",
      "Cronómetro o reloj para práctica de toma de tiempos",
      "Colchoneta para demostración práctica de posición lateral de seguridad"
    ],
    preliminaryNotes: "Se debe enfatizar la regla de oro médica ante convulsiones: ¡NUNCA introducir objetos ni dedos en la boca de una persona que convulsiona!",
    phases: [
      {
        number: 1,
        title: "Apertura y Contextualización: 'Nuestra Respuesta ante lo Inesperado'",
        durationMinutes: 10,
        objective: "Evaluar las reacciones docentes iniciales y establecer la necesidad de protocolos estandarizados.",
        facilitatorScript: "Compañeros docentes: El aula no es solo un espacio pedagógico; es un entorno vivo donde convergen dolores emocionales silenciosos y emergencias médicas imprevistas. ¿Cómo reaccionamos cuando un estudiante comienza a hiperventilar antes de un examen? ¿O cuando un alumno se desvanece y empieza a convulsionar frente a todo el grado?\\n\\nEl miedo y la improvisación son nuestros peores enemigos. Hoy aprenderemos a actuar con serenidad, técnica y rigor para salvar vidas y proteger la dignidad de nuestros estudiantes.",
        groupDynamics: "Pregunta detonante rápida en tarjetas."
      },
      {
        number: 2,
        title: "Módulo Psicosocial: Detección de Ansiedad, Depresión y Riesgo Autolítico",
        durationMinutes: 20,
        objective: "Reconocer las diferencias clínicas y el manejo en aula de descompensaciones emocionales.",
        facilitatorScript: "Revisemos las señales:\\n- En ANSIEDAD: Taquicardia, sudoración, bloqueo cognitivo y temblores. Necesita respiración diafragmática y presencia tranquilizadora.\\n- En DEPRESIÓN: Apatía sostenida, abandono del cuidado personal, frases de desesperanza y mutismo.\\n- En RIESGO SUICIDA: Cualquier mención explícita o indirecta exige no dejar solo al estudiante y activar la Ficha de Alerta al DECE en el mismo instante.",
        groupDynamics: "Exposición dialogada con tabla comparativa de síntomas."
      },
      {
        number: 3,
        title: "Módulo Médico-Escolar: Protocolo de Primeros Auxilios ante Crisis Epilépticas",
        durationMinutes: 25,
        objective: "Dominar las maniobras de auxilio y erradicar mitos lesivos ante convulsiones.",
        facilitatorScript: "Si un estudiante convulsiona en su aula, sigan estos 5 pasos inmutables:\\n1. CONSERVE LA CALMA Y MIRE EL RELOJ: Cronometre la crisis. Si dura más de 5 minutos, active ECU-911 de inmediato.\\n2. PROTEJA LA CABEZA: Coloque una chaqueta o almohada bajo su cabeza para evitar traumatismos contra el piso.\\n3. DESPEJE EL ESPACIO: Aparte pupitres y pida a los compañeros que se retiren ordenadamente para darle ventilación y privacidad.\\n4. NUNCA META NADA EN SU BOCA: No intente sujetar la lengua ni meter cucharas ni dedos; puede fracturar la mandíbula o ahogar al estudiante.\\n5. POSICIÓN LATERAL DE SEGURIDAD: Una vez que cesen los espasmos, gírelo suavemente de lado para que respire bien y no aspire secreciones.",
        groupDynamics: "Demostración en vivo de la Posición Lateral de Seguridad (PLS) con voluntarios.",
        materialsNeeded: ["Guía de Bolsillo de Primeros Auxilios en Epilepsia"]
      },
      {
        number: 4,
        title: "Taller en Subgrupos: 'Las 10 Situaciones de Alerta en Aula'",
        durationMinutes: 25,
        objective: "Aplicar los protocolos aprendidos a situaciones reales simuladas.",
        facilitatorScript: "Vamos a dividirnos en mesas. A cada mesa le entregamos tarjetas con las 10 situaciones reales anonimizadas (desde el estudiante con insomnio y bajas notas hasta la crisis epiléptica en laboratorio). Cada grupo definirá qué paso inmediato dar y qué formato del DECE activar.",
        groupDynamics: "Análisis de casos con las tarjetas recortables y retroalimentación plenaria.",
        materialsNeeded: ["Tarjetas Recortables de las 10 Situaciones de Alerta (Material descargable)"]
      },
      {
        number: 5,
        title: "Cierre, Fichas de Alerta y Coordinación Intersectorial",
        durationMinutes: 10,
        objective: "Fijar las vías de comunicación con el MSP, DECE y familias.",
        facilitatorScript: "Toda crisis médica o psicosocial atendida debe registrarse de inmediato en la Ficha de Notificación de Alerta del DECE para que se coordine el seguimiento con el centro de salud y la familia. Gracias colegas por ser la primera línea de protección de nuestra niñez.",
        groupDynamics: "Entrega de protocolo de bolsillo y despedida."
      }
    ],
    downloadableMaterials: [
      {
        id: "tarjetas-casos-alerta-aula",
        title: "Tarjetas Recortables: '10 Situaciones de Alerta Psicosocial y Médica'",
        description: "Lámina con las 10 situaciones de simulación divididas por líneas de corte punteadas: casos de pánico pre-examen, aislamiento depresivo, ideación autolítica, ausentismo por estrés y convulsiones en clase.",
        type: "RECORTABLE",
        targetUser: "Docentes de Todos los Niveles",
        printInstructions: "Imprimir en hoja A4 y recortar las tarjetas individuales para dinámicas de trabajo en grupos.",
        fileName: "Tarjetas_Casos_Alerta_Aula_Epilepsia_SADEX.docx"
      },
      {
        id: "protocolo-bolsillo-epilepsia",
        title: "Protocolo de Bolsillo: Primeros Auxilios ante Crisis Epiléptica en Aula",
        description: "Guía rápida plastificable para docentes con el flujograma visual de los 5 pasos obligatorios, la maniobra PLS (Posición Lateral de Seguridad) y la lista de prohibiciones médicas.",
        type: "GUIA_BOLSILLO",
        targetUser: "Personal Docente y Administrativo",
        printInstructions: "Imprimir a color en hoja A4 plegable en dos caras. Ideal para tener en el botiquín del aula o carpeta docente.",
        fileName: "Protocolo_Bolsillo_Primeros_Auxilios_Epilepsia_SADEX.docx"
      }
    ]
  },

  // 9. Educar desde la Interculturalidad: Herramientas contra el Racismo
  {
    id: "discriminacion-racismo-interculturalidad",
    slug: "discriminacion-racismo-interculturalidad",
    title: "Taller para Docentes: 'Educar desde la Interculturalidad y sin Racismo'",
    subtitle: "Pautas pedagógicas para prevenir, detectar y abordar la discriminación racial, xenofobia y exclusión escolar.",
    category: "PREVENCION_044A",
    categoryLabel: "Convivencia Intercultural (044-A)",
    normativeBase: "Lineamientos de Convivencia Intercultural MINEDUC & LOEI Art. 73",
    targetAudiences: ["DOCENTES", "COMUNIDAD_EDUCATIVA", "PROFESIONALES_DECE"],
    targetAudienceLabel: "Docentes de Inicial a Bachillerato y Equipos de Convivencia Escolar",
    estimatedDuration: "90 minutos",
    relatedActionPlanTopic: "CONVIVENCIA",
    generalObjective: "Fortalecer las capacidades del personal docente para prevenir, detectar y abordar situaciones de racismo, discriminación y xenofobia, promoviendo prácticas pedagógicas inclusivas que celebren la diversidad cultural de la comunidad educativa.",
    specificObjectives: [
      "Distinguir con precisión los conceptos de estereotipo, prejuicio, discriminación y racismo estructural.",
      "Identificar microagresiones verbales cotidianas en los pasillos y aulas que vulneran la dignidad de estudiantes afrodescendientes, indígenas y migrantes.",
      "Aplicar dinámicas de desarticulación de prejuicios en el ejercicio docente.",
      "Elaborar un Decálogo Institucional de Convivencia Intercultural y Cultura de Paz."
    ],
    materialsGeneral: [
      "Tarjetas de frases y microagresiones para análisis",
      "Láminas del Árbol de las Raíces Culturales",
      "Papelógrafos y marcadores para el decálogo",
      "Post-its de colores para compromisos docentes"
    ],
    preliminaryNotes: "El facilitador debe fomentar un debate autocrítico y respetuoso, reconociendo que muchas formas de racismo operan de manera sutil o normalizada en el lenguaje cotidiano.",
    phases: [
      {
        number: 1,
        title: "Activación: '¿Lo Has Escuchado Antes en el Colegio?'",
        durationMinutes: 15,
        objective: "Desnaturalizar frases discriminatorias normalizadas en la cultura escolar.",
        facilitatorScript: "Compañeros docentes: Iniciemos escuchando frases que a veces se pronuncian en colegios sin medir su impacto destructivo:\\n- 'Esos estudiantes no se integran porque no saben comportarse'.\\n- 'Esa niña debería peinarse mejor, con ese pelo afro no se ve formal'.\\n- 'Aquí hablamos bien el español, no como en tu país'.\\n\\n¿Qué prejuicio se esconde detrás de estas palabras? ¿Qué herida dejan en la identidad y autoestima de un niño o adolescente que escucha esto de sus propios maestros o compañeros?",
        groupDynamics: "Lectura de tarjetas de frases y reflexión guiada.",
        reflectionQuestions: [
          "¿Por qué tendemos a asumir que nuestra cultura o forma de hablar es la 'correcta' y las demás son 'raras'?",
          "¿Cómo impacta el racismo en el rendimiento académico y la deserción escolar?"
        ]
      },
      {
        number: 2,
        title: "Encuadre Conceptual: La Escalera de la Discriminación",
        durationMinutes: 20,
        objective: "Comprender cómo un estereotipo no frenado puede escalar a violencia y exclusión.",
        facilitatorScript: "El racismo no empieza con agresiones físicas; empieza en el pensamiento con ESTEREOTIPOS (generalizaciones simplistas), avanza hacia PREJUICIOS (juicios de valor despectivos sin conocer a la persona), se materializa en DISCRIMINACIÓN (trato desigual y privación de oportunidades) y puede terminar en VIOLENCIA o acoso escolar sistémico. Nuestra misión pedagógica es romper esa escalera en el primer peldaño.",
        groupDynamics: "Exposición visual de la Escalera de la Discriminación."
      },
      {
        number: 3,
        title: "Dinámica en Grupos: 'El Árbol de la Diversidad y la Interculturalidad'",
        durationMinutes: 25,
        objective: "Valorar los aportes de las diversas culturas presentes en la institución educativa.",
        facilitatorScript: "En equipos de trabajo vamos a analizar situaciones reales de exclusión en el aula y propondremos alternativas pedagógicas que conviertan la diferencia en una fuente de riqueza colectiva. Por ejemplo: ¿Cómo incorporamos la gastronomía, saberes ancestrales y literatura afroecuatoriana e indígena en nuestras planificaciones curriculares de clase?",
        groupDynamics: "Mesas de trabajo por subniveles con tarjetas de casos.",
        materialsNeeded: ["Tarjetas de Frases y Casos de Discriminación (Material recortable)"]
      },
      {
        number: 4,
        title: "Construcción Colectiva: Decálogo de la Escuela Intercultural",
        durationMinutes: 20,
        objective: "Traducir la reflexión en normas claras de convivencia escolar inclusiva.",
        facilitatorScript: "Redactemos entre todos nuestro Decálogo Institucional. Normas claras como: 'En nuestra institución el acento, color de piel y origen cultural son motivo de orgullo, nunca de burla', 'Cero tolerancia a apodos racistas en el aula y patio'.",
        groupDynamics: "Redacción plenaria del decálogo en papelógrafo mural."
      },
      {
        number: 5,
        title: "Cierre y Compromiso Pedagógico",
        durationMinutes: 10,
        objective: "Firmar el pacto ético docente por la dignidad y la equidad.",
        facilitatorScript: "Educar para la interculturalidad es educar para la justicia. Cada uno firma su tarjeta de compromiso personal para erradicar cualquier sesgo en el trato con sus estudiantes. ¡Muchas gracias!",
        groupDynamics: "Firma del Decálogo de la Convivencia Intercultural."
      }
    ],
    downloadableMaterials: [
      {
        id: "tarjetas-frases-estereotipos",
        title: "Tarjetas Recortables: 'Frases y Microagresiones para el Debate Docente'",
        description: "Contiene 8 tarjetas recortables con frases cotidianas de estereotipos y prejuicios raciales y xenófobos en el contexto escolar ecuatoriano, acompañadas de preguntas de deconstrucción para mesas de trabajo.",
        type: "RECORTABLE",
        targetUser: "Docentes y Directivos",
        printInstructions: "Imprimir en hoja A4 y recortar por los bordes para repartir una frase a cada pareja de educadores.",
        fileName: "Tarjetas_Debate_Racismo_y_Microagresiones_SADEX.docx"
      },
      {
        id: "decalogo-convivencia-intercultural",
        title: "Decálogo y Compromiso por una Escuela Inclusiva e Intercultural",
        description: "Plantilla institucional para publicar en las salas de profesores y carteleras con los 10 principios de no discriminación y espacios para firmas de compromiso del equipo docente.",
        type: "FICHA_TRABAJO",
        targetUser: "Comunidad Educativa",
        printInstructions: "Imprimir en formato cartel A4 o A3 para exhibir en el plantel.",
        fileName: "Decalogo_Escuela_Intercultural_Inclusiva_SADEX.docx"
      }
    ]
  },

  // 10. Diversidad Institucional: Rostros e Historias
  {
    id: "diversidad-rostros-historias",
    slug: "diversidad-rostros-historias",
    title: "Taller de Sensibilización: 'Diversidad Institucional y Miradas sin Prejuicios'",
    subtitle: "Historias reales impactantes para desafiar las etiquetas externas y valorar la dignidad interior de cada ser humano.",
    category: "DESARROLLO_SOCIOEMOCIONAL",
    categoryLabel: "Inclusión y Empatía Social",
    normativeBase: "Modelo de Inclusión Educativa MINEDUC & LOEI Art. 73",
    targetAudiences: ["ESTUDIANTES_SECUNDARIA", "DOCENTES"],
    targetAudienceLabel: "Estudiantes de Básica Media, Superior y Bachillerato",
    estimatedDuration: "60 minutos",
    relatedActionPlanTopic: "CONVIVENCIA",
    generalObjective: "Sensibilizar a los participantes sobre el peligro de juzgar a las personas por su apariencia física, condición económica o estilo de vida, explorando historias biográficas que evidencian la complejidad, grandeza y dignidad humana.",
    specificObjectives: [
      "Cuestionar los sesgos inconscientes que aplicamos automáticamente al ver a alguien por primera vez.",
      "Analizar biografías contrastantes (el Dr. Umar Khan, Julius Lederer, Vladimir Franz) para comprender la diversidad humana.",
      "Fomentar la escucha activa y la compasión frente a situaciones de vulnerabilidad o exclusión social.",
      "Elaborar un manifiesto grupal contra el estigma y las etiquetas fáciles en la escuela."
    ],
    materialsGeneral: [
      "Tarjetas de historias biográficas impresas",
      "Fotografías o siluetas de personajes para dinámica ciega",
      "Hojas para redacción de reflexiones personales"
    ],
    preliminaryNotes: "Dinámica potente de impacto emocional. Se recomienda mostrar primero las fotos o datos externos sin revelar la profesión o historia, permitiendo que los estudiantes expresen sus hipótesis iniciales antes de conocer la verdad.",
    phases: [
      {
        number: 1,
        title: "Dinámica Inicial: '¿Quién Crees que Soy?'",
        durationMinutes: 15,
        objective: "Evidenciar cómo los prejuicios externos sesgan nuestra percepción.",
        facilitatorScript: "Buenos días. Les voy a mostrar tres perfiles anónimos:\\n1. Una persona tatuada de pies a cabeza en el rostro.\\n2. Un hombre que vivió años en la indigencia cubierto con bolsas de basura.\\n3. Un médico en una zona remota de África.\\nSi tuvieran que elegir a quién pedir un consejo legal, quién es un héroe de la humanidad y quién tiene una historia artística asombrosa, ¿a quién elegirían? Vamos a descubrir qué hay detrás de las apariencias.",
        groupDynamics: "Juego de deducción y contrastación de hipótesis."
      },
      {
        number: 2,
        title: "Lectura Dramatizada: Historias que Desafían Prejuicios",
        durationMinutes: 25,
        objective: "Profundizar en las biografías del Dr. Khan, Julius Lederer y Vladimir Franz.",
        facilitatorScript: "Revisemos estas historias reales:\\n- El Dr. Umar Khan fue un científico héroe que dio su vida combatiendo el ébola en Sierra Leona.\\n- Vladimir Franz, con su rostro tatuado, es un eminente catedrático universitario, abogado, pintor y compositor musical de renombre mundial.\\n- Julius Lederer fue un hombre educado que decidió renunciar al consumo material para vivir en libertad interior y respeto.\\n¿Por qué la sociedad tiende a etiquetar a las personas por una foto antes de conocer su alma?",
        groupDynamics: "Lectura en subgrupos de las tarjetas recortables de historias.",
        materialsNeeded: ["Tarjetas Recortables de Historias de Diversidad (Material descargable)"]
      },
      {
        number: 3,
        title: "Plenaria: 'El Espejo en Nuestro Colegio'",
        durationMinutes: 10,
        objective: "Aterrizar la lección al entorno escolar y las relaciones entre compañeros.",
        facilitatorScript: "¿A cuántos compañeros de este colegio los hemos juzgado por su ropa, su timidez, su corte de pelo o su barrio sin saber la historia valiente que llevan por dentro? A partir de hoy, ¿cómo nos comprometemos a mirar a los demás?",
        reflectionQuestions: [
          "¿Alguna vez te has sentido juzgado injustamente por algo externo?",
          "¿Qué se necesita para mirar a otra persona con verdadera empatía?"
        ]
      },
      {
        number: 4,
        title: "Cierre: Manifiesto por una Mirada Libre de Etiquetas",
        durationMinutes: 10,
        objective: "Consolidar el compromiso del respeto a la diversidad.",
        facilitatorScript: "Escribamos en nuestra tarjeta una promesa de respeto: 'Prometo mirar más allá de la apariencia y reconocer la dignidad única de cada ser humano'. ¡Gracias a todos!",
        groupDynamics: "Pegado de compromisos en el mural de aula."
      }
    ],
    downloadableMaterials: [
      {
        id: "tarjetas-historias-diversidad",
        title: "Tarjetas Recortables: 'Historias Reales que Rompen Estereotipos'",
        description: "Set de 4 tarjetas recortables con las biografías completas y preguntas de análisis sobre el Dr. Umar Khan, Julius Lederer y Vladimir Franz para dinámicas de debate ético en el aula.",
        type: "RECORTABLE",
        targetUser: "Estudiantes de Secundaria y Docentes",
        printInstructions: "Imprimir en hoja bond A4 a doble cara y recortar las tarjetas de trabajo.",
        fileName: "Tarjetas_Historias_Diversidad_y_Prejuicios_SADEX.docx"
      }
    ]
  },

  // 11. Taller de Comunicación Asertiva
  {
    id: "comunicacion-asertiva-objeto",
    slug: "comunicacion-asertiva-objeto",
    title: "Taller Vivencial: 'Comunicación Asertiva: El Objeto que no Dice su Nombre'",
    subtitle: "Dinámica simbólica e introspectiva para fortalecer la asertividad y el clima de relaciones institucionales.",
    category: "DESARROLLO_SOCIOEMOCIONAL",
    categoryLabel: "Habilidades para la Vida y Convivencia",
    normativeBase: "Modelo de Prevención DECE & LOEI Art. 73",
    targetAudiences: ["DOCENTES", "ESTUDIANTES_SECUNDARIA", "PROFESIONALES_DECE"],
    targetAudienceLabel: "Personal Docente, Administrativo y Estudiantes de Bachillerato",
    estimatedDuration: "90 minutos",
    relatedActionPlanTopic: "SOCIOEMOCIONAL",
    generalObjective: "Desarrollar habilidades de comunicación asertiva, escucha activa y resolución pacífica de discrepancias en el entorno escolar mediante dinámicas proyectivas y el entrenamiento en 'Mensajes Yo'.",
    specificObjectives: [
      "Identificar el propio estilo comunicativo (pasivo, agresivo, pasivo-agresivo o asertivo) y sus consecuencias en las relaciones interpersonales.",
      "Utilizar la metáfora de objetos cotidianos para expresar inquietudes y vivencias laborales o académicas de forma segura.",
      "Aprender a estructurar peticiones y límites firmes sin recurrir a la agresividad ni al silencio sumiso ('Técnica del Mensaje Yo').",
      "Fortalecer el clima de confianza y trabajo en equipo institucional."
    ],
    materialsGeneral: [
      "Mesa central con objetos variados (piedras, llaves, sogas, espejos, cuerdas, clips, botellitas)",
      "Tarjetas de entrenamiento en 'Mensajes Yo'",
      "Música instrumental suave de fondo",
      "Hojas y bolígrafos para compromisos de comunicación"
    ],
    preliminaryNotes: "La dinámica con objetos permite proyectar emociones sin exponerse de manera vulnerable de golpe, facilitando la participación incluso de las personas más reservadas.",
    phases: [
      {
        number: 1,
        title: "Dinámica Proyectiva: 'El Objeto que no Dice su Nombre'",
        durationMinutes: 25,
        objective: "Facilitar una conexión simbólica profunda sobre el propio rol en la institución.",
        facilitatorScript: "Bienvenidos. En la mesa central hay diversos objetos: una piedra pesada, una cuerda con nudos, una llave dorada, un espejo, un clip flexible...\\n\\nSin hablar, cada participante se acercará a la mesa y tomará un objeto que de alguna manera represente cómo se siente en su comunicación cotidiana dentro de esta institución. ¿Se siente como un nudo apretado? ¿Como un clip que debe adaptarse a todo? ¿Como una llave que busca abrir puertas cerradas? Luego nos sentaremos en círculo y compartiremos brevemente por qué elegimos ese objeto.",
        groupDynamics: "Elección silenciosa de objeto y ronda reflexiva de escucha empática.",
        reflectionQuestions: [
          "¿Por qué a veces es más fácil expresar lo que sentimos a través de una metáfora que con palabras directas?",
          "¿Qué objeto te gustaría llegar a ser en tu comunicación con los demás?"
        ]
      },
      {
        number: 2,
        title: "Taller Técnico: Los 3 Estilos de Comunicación y el 'Mensaje Yo'",
        durationMinutes: 25,
        objective: "Aprender la fórmula técnica de la comunicación asertiva sin agresión ni sumisión.",
        facilitatorScript: "Analicemos los tres estilos:\\n- PASIVO: Se calla, acumula resentimiento y no defiende sus derechos por miedo al conflicto.\\n- AGRESIVO: Ataca, interrumpe, culpa con 'Tú siempre...' o 'Tú nunca...' y daña el vínculo.\\n- ASERTIVO: Expresa lo que piensa y siente con respeto, claridad y firmeza.\\n\\nLa fórmula mágica del 'Mensaje Yo' es:\\n'Cuando ocurre [hecho objetivo sin juzgar], yo me siento [mi emoción], porque necesito [mi necesidad]. Por eso te propongo [acuerdo concreto]'.",
        groupDynamics: "Exposición dialogada y práctica de reescritura de quejas a 'Mensajes Yo'."
      },
      {
        number: 3,
        title: "Laboratorio en Parejas: Desactivando Conversaciones Difíciles",
        durationMinutes: 25,
        objective: "Entrenar la fórmula del 'Mensaje Yo' en situaciones tensas simuladas.",
        facilitatorScript: "En parejas vamos a tomar una tarjeta de situación conflictiva (ej: un colega que no entrega su parte a tiempo, un docente que le grita a otro en el pasillo, un estudiante que interrumpe). Un compañero planteará la situación con ataque y el otro responderá aplicando el 'Mensaje Yo' hasta transformar el choque en un acuerdo constructivo.",
        groupDynamics: "Juego de roles cruzado con retroalimentación.",
        materialsNeeded: ["Tarjetas de Entrenamiento en Mensajes Yo (Material recortable descargable)"]
      },
      {
        number: 4,
        title: "Cierre y Devolución de Objetos",
        durationMinutes: 15,
        objective: "Cerrar el ciclo simbólico y asumir compromisos de asertividad.",
        facilitatorScript: "Vamos a devolver nuestros objetos a la mesa, agradeciendo lo que nos permitieron ver hoy. Cada uno se lleva en su bolsillo su tarjeta de 'Mensaje Yo' para recordarla antes de responder en caliente en su día a día. ¡Gracias por su valentía para comunicarse desde el corazón y el respeto!",
        groupDynamics: "Acto simbólico de cierre y aplauso grupal."
      }
    ],
    downloadableMaterials: [
      {
        id: "tarjetas-mensajes-yo-asertividad",
        title: "Tarjetas Recortables: 'Guía Práctica del Mensaje Yo y Comunicación Asertiva'",
        description: "Set de 4 tarjetas recortables con la estructura paso a paso para formular peticiones asertivas, ejemplos de transformación de reclamos agresivos a acuerdos constructivos y guía rápida para desacuerdos.",
        type: "RECORTABLE",
        targetUser: "Docentes, Personal Administrativo y Familias",
        printInstructions: "Imprimir en cartulina A4 y recortar en formato tarjeta de bolsillo.",
        fileName: "Tarjetas_Entrenamiento_Mensaje_Yo_Asertividad_SADEX.docx"
      }
    ]
  },

  // 12. Redes de Apoyo y Resiliencia Emocional
  {
    id: "redes-apoyo-bienestar-emocional",
    slug: "redes-apoyo-bienestar-emocional",
    title: "Taller Vivencial: 'Construyendo Redes de Apoyo y Bienestar Emocional'",
    subtitle: "Rueda de las emociones, árbol de fortalezas internas y activación de recursos protectores entre pares.",
    category: "PREVENCION_044A",
    categoryLabel: "Salud Mental y Resiliencia (044-A)",
    normativeBase: "Acuerdo Ministerial MINEDUC-044-A (Salud Mental) & LOEI Art. 73",
    targetAudiences: ["ESTUDIANTES_SECUNDARIA", "COMUNIDAD_EDUCATIVA"],
    targetAudienceLabel: "Estudiantes de Básica Superior y Bachillerato",
    estimatedDuration: "60 minutos",
    relatedActionPlanTopic: "SALUD_MENTAL",
    generalObjective: "Brindar herramientas vivenciales a las y los estudiantes para identificar y nombrar sus emociones, reconocer su red protectora de personas de confianza y desarrollar habilidades de resiliencia y autocuidado diario.",
    specificObjectives: [
      "Ampliar el vocabulario emocional utilizando la Rueda de las Emociones para identificar estados anímicos con precisión.",
      "Reconocer a los integrantes clave de la propia red de apoyo en la familia, colegio y comunidad.",
      "Construir colectivamente el Árbol de las Fortalezas Resilientes.",
      "Elaborar un Frasco de Gratitud y Recursos de Emergencia Emocional."
    ],
    materialsGeneral: [
      "Láminas de la Rueda de las Emociones impresas",
      "Fichas del Árbol de Fortalezas y Redes de Apoyo",
      "Papeles adhesivos de colores y marcadores",
      "Frasco o maceta transparente para dinámica de cierre",
      "Tijeras y pegamento escolar"
    ],
    preliminaryNotes: "Espacio de calidez y contención entre pares. Muy útil para semanas previas a evaluaciones o cierres de trimestre.",
    phases: [
      {
        number: 1,
        title: "Bienvenida y Dinámica: 'La Rueda de las Emociones'",
        durationMinutes: 15,
        objective: "Superar el clásico 'estoy bien' o 'estoy mal' nombrando la emoción real.",
        facilitatorScript: "¡Hola a todas y todos! Bienvenidos a este espacio seguro. Muchas veces cuando alguien nos pregunta cómo estamos, respondemos en automático: 'bien'. Pero por dentro podemos sentirnos abrumados, decepcionados, nostálgicos, entusiasmados o frustrados.\\n\\nCada uno tiene en su pupitre la 'Rueda de las Emociones'. Miren los colores y las palabras. Vamos a señalar con nuestro lápiz las 2 emociones que mejor describen cómo nos hemos sentido esta última semana. Nombrar lo que sentimos es el primer paso para gobernarlo y encontrar paz.",
        groupDynamics: "Identificación individual en la rueda y puesta en común voluntaria.",
        materialsNeeded: ["Ficha de la Rueda de las Emociones (Material recortable descargable)"]
      },
      {
        number: 2,
        title: "Actividad Central: 'El Árbol de Mis Redes de Apoyo'",
        durationMinutes: 25,
        objective: "Mapear a las personas reales a las que el estudiante puede acudir en momentos de crisis.",
        facilitatorScript: "Vamos a dibujar y recortar nuestro 'Árbol de Redes de Apoyo':\\n- En las RAÍCES escribiremos nuestras fortalezas personales (lo que nos sostiene cuando hay viento fuerte).\\n- En el TRONCO pondremos nuestras rutinas de autocuidado (lo que nos da energía).\\n- En las RAMAS colocaremos los nombres y teléfonos de nuestras personas protectoras: ¿Quién en tu casa te escucha de verdad? ¿Qué amigo nunca te juzga? ¿Qué profesor o profesional del DECE te da tranquilidad? Nadie tiene que atravesar una tormenta en soledad.",
        groupDynamics: "Construcción individual del árbol con pegado de hojas protectoras.",
        materialsNeeded: ["Ficha del Árbol de Redes de Apoyo"]
      },
      {
        number: 3,
        title: "Dinámica Simbólica: 'El Frasco de la Gratitud y Esperanza'",
        durationMinutes: 15,
        objective: "Sembrar recursos de optimismo y apoyo mutuo para el aula.",
        facilitatorScript: "En este frasco transparente vamos a depositar una palabra de gratitud o un deseo sincero para nuestro grado. Este frasco quedará en el aula como nuestro cofre de luz: si un día alguien se siente triste, podrá abrir el frasco y leer uno de estos mensajes que sus propios compañeros escribieron con el corazón.",
        groupDynamics: "Llenado colectivo del frasco con música reflexiva."
      },
      {
        number: 4,
        title: "Cierre y Directorio de Ayuda",
        durationMinutes: 5,
        objective: "Recordar los canales oficiales de asistencia médica y psicológica.",
        facilitatorScript: "Recuerden llevar su Árbol de Redes de Apoyo pegado en su cuaderno. Y no olviden que el DECE de nuestra institución está siempre con las puertas abiertas para ustedes. ¡Cuidarnos es amarnos!",
        groupDynamics: "Aplauso colectivo y cierre del taller."
      }
    ],
    downloadableMaterials: [
      {
        id: "rueda-emociones-arbol-apoyo",
        title: "Ficha Recortable: 'La Rueda de las Emociones y el Árbol de Redes de Apoyo'",
        description: "Contiene la Rueda de Emociones ilustrada con círculos concéntricos de intensidad emocional y la plantilla del Árbol de Fortalezas con raíces, tronco y ramas para recortar y mapear personas de auxilio.",
        type: "RECORTABLE",
        targetUser: "Estudiantes de Básica Superior y Bachillerato",
        printInstructions: "Imprimir en cartulina o papel bond A4 a color o blanco y negro.",
        fileName: "Ficha_Recortable_Rueda_Emociones_y_Arbol_Apoyo_SADEX.docx"
      }
    ]
  }
];

export function getWorkshopById(id: string): WorkshopItem | undefined {
  return WORKSHOPS_DATABASE.find((w) => w.id === id || w.slug === id);
}
