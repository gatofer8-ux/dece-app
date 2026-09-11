import type { WorkshopItem } from "./types";

export const WORKSHOPS_DATABASE: WorkshopItem[] = [
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
        facilitatorScript: "¡Buenas tardes a todas y todos! Hoy nos reunimos para hablar de un tema de vital importancia para nuestra comunidad: el cuidado de nuestra vida, nuestra salud emocional y cómo podemos ser guardianes y apoyo para nosotros mismos y para quienes nos rodean.\n\nQuiero comenzar agradeciéndoles por su presencia. Este espacio está diseñado con base en el respeto mutuo y la confidencialidad. Lo que compartamos aquí se queda aquí. Hablar de nuestras emociones no nos hace débiles; al contrario, pedir ayuda y saber escuchar es el mayor acto de valentía y solidaridad que podemos demostrar en nuestra institución.",
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
        facilitatorScript: "Nos vamos a colocar en círculo. Cada uno tiene una pequeña tarjeta. Van a escribir en ella una frase o palabra de aliento que a ustedes les gustaría escuchar cuando están pasando por un día muy difícil (ej: 'No estás solo', 'Vales mucho', 'Esto también pasará').\n\nAhora vamos a lanzar este balón a un compañero al azar. Quien lo reciba leerá su frase con voz clara y compartirá por qué esa frase le reconforta, luego se la pasará a otro compañero hasta que todos hayamos tejido una red protectora de palabras.",
        groupDynamics: "Dinámica de la Cadena de Apoyo en círculo con un balón o madeja de lana.",
        materialsNeeded: ["Tarjetas de apoyo", "Balón o madeja de lana"]
      },
      {
        number: 3,
        title: "Actividad Central: Juego de Roles y Análisis de Casos 'Identificando Señales de Alerta'",
        durationMinutes: 30,
        objective: "Entrenar la capacidad de observación para reconocer niveles de riesgo y saber cómo intervenir sin juzgar.",
        facilitatorScript: "Vamos a dividirnos en 4 grupos de trabajo. A cada grupo le entregaré una tarjeta con un caso real anonimizado (Caso 1: Estrés académico, Caso 2: Depresión y aislamiento, Caso 3: Conductas de riesgo y autolesiones, Caso 4: Crisis de riesgo inminente).\n\nEn sus grupos van a leer el caso y responderán tres preguntas clave:\n1. ¿Cuáles son las señales de alerta que muestra el estudiante?\n2. ¿Qué actitudes o respuestas por parte de compañeros o profesores empeorarían su situación?\n3. ¿Cuál es el paso correcto que debemos dar de inmediato?",
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
        facilitatorScript: "Para cerrar, recordemos la ruta oficial de nuestra institución:\n- Si detectas que un compañero está en riesgo, avisa de inmediato a tu docente tutor o al personal del DECE. No te quedes con ese secreto: buscar ayuda salva vidas.\n- Ante cualquier emergencia fuera del horario escolar, recuerda que la línea nacional 171 (opción 6 de salud mental) y el ECU-911 están disponibles las 24 horas del día de manera gratuita y confidencial.\n\nGracias a cada uno de ustedes por su apertura, respeto y compromiso con la vida.",
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
        facilitatorScript: "Estimados compañeros educadores: En nuestro día a día en el aula nos encontramos frecuentemente con estudiantes que experimentan ataques de pánico, llanto incontrolable por crisis familiares o bloqueos ante situaciones de estrés extremo.\n\nLos Primeros Auxilios Psicológicos son como los primeros auxilios médicos: no reemplazan a la cirugía ni al médico especialista, pero detienen la hemorragia y salvan vidas en los primeros minutos. Los PAP buscan brindar alivio inmediato, devolver la sensación de seguridad y evitar que el evento traumático se agrave. No juzgamos, no diagnosticamos, no forzamos a hablar: acompañamos con calidez y presencia tranquilizadora.",
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
        facilitatorScript: "Vamos a desglosar los cinco pilares de los PAP:\n1. ESCUCHAR: Colócate a su misma altura física, haz contacto visual suave y valida su emoción con frases como: 'Estoy aquí contigo, estás a salvo'.\n2. PROTEGER: Aparta al estudiante de miradas curiosas o del bullicio del patio. Llévalo a un lugar ventilado y tranquilo.\n3. CONSOLAR: Ayúdale a regular su respiración. Invítale a beber un sorbo de agua a temperatura ambiente.\n4. INFORMAR: Si hubo un rumor o accidente, explícale con palabras sencillas y certeras lo que está pasando, reduciendo la incertidumbre.\n5. CONECTAR: No lo dejes solo. Comunícate de inmediato con el DECE y con su representante legal para generar la red protectora.",
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
        facilitatorScript: "Cuando una persona está en pánico, su cerebro está atrapado en un bucle de alerta. La técnica 5-4-3-2-1 la trae de vuelta al presente mediante los cinco sentidos:\n- Nombra 5 cosas que puedas VER a tu alrededor.\n- Nombra 4 cosas que puedas TOCAR (la textura de tu ropa, la mesa, tus manos).\n- Nombra 3 cosas que puedas ESCUCHAR (el viento, mi voz, los pasos lejanos).\n- Nombra 2 cosas que puedas OLER.\n- Nombra 1 cosa que puedas SABOREAR o algo bueno de ti mismo.\nVamos a practicarla todos juntos en este instante.",
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
        facilitatorScript: "¡Hola a todas y todos, campeones! ¿Quién de ustedes sabe qué es la autoestima?\n(Los niños responden libremente).\n¡Excelente! La autoestima es el amor y respeto que sentimos por nosotros mismos: es saber que somos personas únicas, valiosas e irrepetibles.\n\nHoy tengo un globo en mis manos. Cuando en casa o en la escuela nos dicen cosas bonitas o reconocemos nuestros logros, nuestro globo se infla grande y brillante. Pero cuando alguien nos ofende o nosotros mismos nos tratamos mal, el globo se desinfla un poquito. Vamos a inflar nuestro propio globo y escribiremos en él una palabra que nos haga sentir súper felices con nosotros mismos.",
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
        facilitatorScript: "¡Ahora manos a la obra! A cada uno le voy a entregar su ficha de 'Mi Flor de Fortalezas'. En el centro de la flor van a dibujar su carita sonriente. En cada uno de los pétalos recortables van a escribir o dibujar cosas maravillosas de ustedes:\n- Pétalo 1: Algo en lo que soy genial.\n- Pétalo 2: Un buen acto que hice por alguien.\n- Pétalo 3: Algo que me hace sonreír.\n- Pétalo 4: Un sueño que quiero cumplir.\nLuego recortamos los pétalos y armamos nuestra flor decorada con colores hermosos.",
        groupDynamics: "Trabajo manual en pupitres con tijeras escolares y pegamento. El facilitador y el docente recorren el aula reforzando a los niños.",
        materialsNeeded: ["Ficha Recortable 'Mi Flor de Fortalezas' (Material descargable)", "Tijeras", "Pegamento", "Colores"]
      },
      {
        number: 4,
        title: "Galería de Flores y Compromiso de Cierre",
        durationMinutes: 10,
        objective: "Celebrar los trabajos de todos y fijar el compromiso del buen trato.",
        facilitatorScript: "Vamos a levantar todos nuestra flor de fortalezas bien alto. Miren qué hermoso jardín hemos formado hoy. Ninguna flor es mejor que otra: todas son especiales. Vamos a repetir juntos nuestro juramento del superhéroe del buen trato:\n'Yo soy importante, yo soy valioso, y me comprometo a tratarme con amor a mí mismo y a cuidar el corazón de mis compañeros'.\n¡Un fuertísimo aplauso para todas y todos!",
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
        facilitatorScript: "Colegas del Departamento de Consejería Estudiantil: Cuando un estudiante llega tarde, no presenta una tarea o muestra retraimiento, muchas veces la institución tiende a etiquetarlo bajo una mirada punitiva o meramente conductual.\n\nSin embargo, la realidad de nuestros territorios nos muestra que los niños y adolescentes en situación de pobreza enfrentan privaciones severas no solo materiales, sino de tiempo, nutrición y soporte afectivo. Las niñas, por ejemplo, asumen tempranamente el rol machista de cuidadoras de hermanos menores mientras las madres salen a trabajar en la informalidad, lo cual compromete directamente su permanencia escolar. Como DECE, nuestra mirada técnica debe trascender el síntoma y comprender la raíz estructural del contexto.",
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
        facilitatorScript: "Vamos a realizar el ejercicio 'El Contexto es mucho texto'. A cada grupo se le asignará una situación de vida real: 1) Estudiante con doble jornada laboral y escolar; 2) Adolescente a cargo del cuidado de adultos mayores; 3) Estudiante sin conectividad ni luz eléctrica; 4) Estudiante de familia con estabilidad económica.\n\nCada grupo deberá representar su realidad ante la plenaria SIN PRONUNCIAR UNA SOLA PALABRA, utilizando únicamente expresión corporal, silencios y objetos del entorno. Los demás grupos deberán decodificar las barreras invisibles que experimenta esa persona.",
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
  }
];

export function getWorkshopById(id: string): WorkshopItem | undefined {
  return WORKSHOPS_DATABASE.find((w) => w.id === id || w.slug === id);
}
