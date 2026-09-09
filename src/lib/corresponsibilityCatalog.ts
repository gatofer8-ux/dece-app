import type { CorresponsibilityConflictType } from "./types";

export interface ConflictTypeOption {
  type: CorresponsibilityConflictType;
  label: string;
  shortDescription: string;
  defaultLegalFramework: string;
  defaultRepresentativeCommitments: string;
  defaultDeceCommitments: string;
}

export const CONFLICT_TYPES_CATALOG: Record<CorresponsibilityConflictType, ConflictTypeOption> = {
  CONVIVENCIA_AGRESIVIDAD: {
    type: "CONVIVENCIA_AGRESIVIDAD",
    label: "Convivencia Escolar / Agresión entre Pares",
    shortDescription: "Altercados físicos, verbales, burlas, ciberacoso o conflictos de disciplina escolar.",
    defaultLegalFramework: `En consideración a lo que menciona la Ley Orgánica de Educación Intercultural (LOEI) en su Artículo 13 (literales “c”, “d”, “h”) referente a la obligación de las familias de propiciar una cultura de paz, diálogo y no violencia; Artículo 132 y 134 sobre faltas y régimen disciplinario; Acuerdo Ministerial MINEDUC-2023-00008-A referente a la resolución pacífica y restaurativa de conflictos en el sistema nacional de educación; Código de la Niñez y Adolescencia (CONNA) Art. 39 (numerales 1 y 5 sobre orientar la conducta de los hijos mediante el respeto y sin métodos violentos) y Art. 50 (derecho a la integridad física y psicológica); y el Código de Convivencia Institucional.`,
    defaultRepresentativeCommitments: `1. Conversar diariamente con mi representado/a sobre la importancia del respeto, la empatía y la resolución pacífica de desacuerdos con sus compañeros y docentes.
2. Supervisar activamente el uso de redes sociales, dispositivos electrónicos y amistades dentro y fuera del plantel educativo.
3. Asistir de manera puntual a todos los llamados, talleres formativos de Escuela para Familias y citas individuales programadas por el DECE o Inspección General.
4. Notificar de forma inmediata a la institución sobre cualquier situación o malentendido que involucre a mi representado/a, evitando agresiones o confrontaciones directas con otros estudiantes o representantes.`,
    defaultDeceCommitments: `1. Brindar acompañamiento psicosocial, espacios de escucha activa y orientación individual al estudiante en el desarrollo de habilidades blandas y autorregulación emocional.
2. Coordinar con el docente tutor y el área de Inspección para el seguimiento quincenal de la conducta y convivencia áulica.
3. Monitorear el cumplimiento del presente acuerdo y reportar a la máxima autoridad educativa en caso de presentarse reincidencias.`,
  },

  ASISTENCIA_ABANDONO: {
    type: "ASISTENCIA_ABANDONO",
    label: "Asistencia / Atrasos / Riesgo de Abandono Escolar",
    shortDescription: "Ausentismo reiterado, atrasos no justificados, deserción o desinterés familiar.",
    defaultLegalFramework: `En consideración a lo dispuesto en la Ley Orgánica de Educación Intercultural (LOEI), Artículo 13 (literales “a”, “b”) que establece como obligación primordial de las madres, padres y representantes legales garantizar la asistencia regular y permanencia de sus representados a la institución educativa; Reglamento General a la LOEI (RGLOEI) Artículos 169 al 171 sobre el control y justificación de inasistencias; Código de la Niñez y Adolescencia (CONNA) Art. 39 numeral 2 (asegurar la educación y permanencia de los hijos en el sistema educativo); y Protocolos Ministeriales para la Prevención y Detección Temprana del Abandono Escolar.`,
    defaultRepresentativeCommitments: `1. Garantizar la puntualidad y asistencia diaria de mi representado/a a todas las jornadas académicas establecidas por la institución.
2. Justificar de manera formal y oportuna (dentro de las 48 horas posteriores) cualquier inasistencia por motivos de salud o calamidad doméstica comprobada.
3. Implementar en el hogar una rutina adecuada de descanso nocturno y preparación matutina/vespertina que permita cumplir los horarios escolares.
4. Revisar periódicamente la plataforma institucional y mantener contacto telefónico mensual con el docente tutor para verificar la asistencia regular.`,
    defaultDeceCommitments: `1. Monitorear el registro semanal de asistencia y atrasos en conjunto con Inspección General y el docente tutor.
2. Ofrecer contención y asesoramiento psicosocial para identificar posibles causas sociofamiliares o emocionales que motiven el ausentismo.
3. Activar los protocolos de alerta temprana ante sospecha de deserción escolar y coordinar visitas domiciliarias en caso de persistencia.`,
  },

  RENDIMIENTO_ACADEMICO: {
    type: "RENDIMIENTO_ACADEMICO",
    label: "Rendimiento Académico / Desinterés Escolar",
    shortDescription: "Falta recurrente de entrega de tareas, calificaciones bajas vinculadas a desatención familiar.",
    defaultLegalFramework: `Conforme lo establece la Ley Orgánica de Educación Intercultural (LOEI) en el Artículo 13 (literales “b”, “e”, “f”) sobre el deber de apoyar el proceso pedagógico, supervisar el cumplimiento de actividades escolares y acudir a reuniones informativas; Reglamento General a la LOEI Artículos 18 al 20 sobre la corresponsabilidad en el refuerzo pedagógico; y Código de la Niñez y Adolescencia (CONNA) Art. 39 numeral 4 sobre brindar a los hijos los medios materiales y afectivos para su adecuado desarrollo educativo.`,
    defaultRepresentativeCommitments: `1. Establecer en casa un horario fijo y un ambiente adecuado, libre de distracciones, para la realización de tareas y estudio diario.
2. Revisar diariamente los cuadernos de trabajo, agenda escolar y tareas asignadas por los docentes.
3. Asistir puntualmente a las convocatorias de refuerzo pedagógico y reuniones de entrega de calificaciones.
4. Gestionar apoyo académico adicional o acompañamiento psicopedagógico si las dificultades del estudiante lo requieren.`,
    defaultDeceCommitments: `1. Realizar seguimiento periódico a los reportes de rendimiento y refuerzo académico emitidos por los docentes de asignatura y tutor.
2. Realizar entrevistas de orientación motivacional y organización de hábitos de estudio con el estudiante.
3. Evaluar la pertinencia de adaptaciones curriculares o derivación a evaluación psicopedagógica externa (UDAI) si se detectan barreras de aprendizaje.`,
  },

  NEGLIGENCIA_DESUIDO: {
    type: "NEGLIGENCIA_DESUIDO",
    label: "Negligencia Parental / Descuido en el Acompañamiento",
    shortDescription: "Inasistencia reiterada a citaciones del DECE, desatención a requerimientos de salud o protección básica.",
    defaultLegalFramework: `En consideración a lo que menciona la Ley Orgánica de Educación Intercultural (LOEI) en el Artículo 13 (inciso “a” al “k”) referente a las obligaciones de las madres, padres y/o representantes legales; Código de la Niñez y Adolescencia (CONNA) Artículo 39 sobre obligaciones fundamentales de los progenitores, Artículos 29 y 39 (derechos y deberes de los progenitores con relación a la educación, numerales 1 al 8), Artículo 78 (sanción a la negligencia y desamparo de los hijos) y Artículo 79 (medidas administrativas de protección); y Constitución de la República del Ecuador Art. 44 y 69 sobre la responsabilidad compartida y paternidad responsable.`,
    defaultRepresentativeCommitments: `1. Acudir de manera obligatoria e indelegable a las convocatorias y citaciones efectuadas por el DECE, docentes tutores o autoridades institucionales.
2. Velar diligentemente por las condiciones de salud física, alimentación, higiene personal, vestimenta y bienestar emocional de mi representado/a.
3. Mantener actualizados mis números de teléfono de contacto y dirección domiciliaria ante la secretaría y el DECE de la institución.
4. Brindar un trato respetuoso, afectivo y libre de agresiones en el entorno familiar, priorizando el bienestar superior de mi representado/a.`,
    defaultDeceCommitments: `1. Brindar acompañamiento psicosocial permanente y asesoría familiar en pautas de crianza positiva y corresponsabilidad.
2. Efectuar seguimiento quincenal del estado general y bienestar del estudiante en el aula de clases.
3. Notificar a las instancias judiciales y de protección pertinentes (Junta Cantonal de Protección de Derechos) en caso de evidenciarse persistencia en la negligencia.`,
  },

  VIOLENCIA_VULNERACION: {
    type: "VIOLENCIA_VULNERACION",
    label: "Vulneración de Derechos / Violencia Intrafamiliar o Escolar",
    shortDescription: "Presunta vulneración de derechos, afectación a la integridad o situaciones de riesgo intrafamiliar.",
    defaultLegalFramework: `En consideración a lo consagrado en la Constitución de la República del Ecuador, Artículos 35, 44, 45 y 46 (atención prioritaria y deber ineludible del Estado y la familia de proteger a los NNA de toda forma de violencia, maltrato o explotación); Código de la Niñez y Adolescencia (CONNA) Art. 11 (interés superior del niño), Art. 50 (derecho a la integridad personal, física, psicológica y sexual) y Art. 79 (medidas de protección); Ley Orgánica de Educación Intercultural (LOEI) Art. 8 (literales “a”, “c”, “d”) y Art. 13 (literales “c”, “d”, “h”); Protocolos de Actuación Frente a Situaciones de Violencia Detectadas o Cometidas en el Sistema Educativo (MINEDUC); y Artículo 422 del Código Orgánico Integral Penal (COIP).`,
    defaultRepresentativeCommitments: `1. Proteger de manera estricta e incondicional la integridad física, psicológica y emocional de mi representado/a, garantizando un entorno familiar libre de violencia y amenazas.
2. Cumplir cabalmente con las medidas de protección y recomendaciones dictadas por la institución educativa y los organismos competentes.
3. Cooperar plenamente con las entrevistas psicosociales y procesos de acompañamiento orientados a la restitución de los derechos de mi representado/a.
4. Acudir de inmediato a los servicios de salud y apoyo legal/psicológico especializados indicados en las derivaciones institucionales.`,
    defaultDeceCommitments: `1. Activar el protocolo institucional de actuación frente a presuntas situaciones de violencia y remitir los informes de hecho a la autoridad y a las instancias de protección competentes.
2. Proporcionar contención psicosocial inmediata y acompañamiento confidencial al estudiante.
3. Elaborar y ejecutar el plan de acompañamiento y restitución de derechos con seguimiento semanal dentro del ámbito educativo.`,
  },

  CONSUMO_SUSTANCIAS: {
    type: "CONSUMO_SUSTANCIAS",
    label: "Consumo o Presunción de Uso de Sustancias (Drogas / Alcohol)",
    shortDescription: "Detección o sospecha de consumo de sustancias estupefacientes o psicotrópicas.",
    defaultLegalFramework: `De conformidad con la Ley Orgánica de Educación Intercultural (LOEI), Artículo 13 (literales “g”, “h”) que obliga a los representantes a cuidar el bienestar psicofísico de sus hijos y colaborar en programas de prevención; Protocolo Interinstitucional para el Abordaje Integral del Uso y Consumo de Alcohol, Tabaco y otras Drogas en la Población Estudiantil (MINEDUC / MSP); Ley Orgánica de Prevención Integral del Fenómeno Socioeconómico de las Drogas; y Código de la Niñez y Adolescencia (CONNA) Artículo 27 (derecho a la salud integral).`,
    defaultRepresentativeCommitments: `1. Aceptar y gestionar de manera urgente la atención médica y psicológica especializada en los centros de salud pública (MSP) para la valoración y tratamiento integral de mi representado/a.
2. Presentar al DECE el certificado de ingreso y asistencia continua al proceso terapéutico en un plazo no mayor a 8 días laborables.
3. Supervisar en el hogar los objetos personales, horarios de llegada, compañías y estado físico/conductual de mi representado/a.
4. Participar activamente en los talleres de prevención y orientación familiar programados por el DECE y el centro de salud.`,
    defaultDeceCommitments: `1. Realizar la derivación oficial mediante ficha técnica al Ministerio de Salud Pública (MSP) para la valoración toxicológica y médica.
2. Mantener la estricta confidencialidad del caso dentro del marco normativo educativo, evitando cualquier acto de discriminación o exclusión.
3. Brindar acompañamiento psicosocial quincenal al estudiante y solicitar periódicamente los certificados de adherencia al tratamiento de salud.`,
  },

  APOYO_EXTERNO_DERIVACION: {
    type: "APOYO_EXTERNO_DERIVACION",
    label: "Atención Externa Especializada / Derivación no Cumplida",
    shortDescription: "Incumplimiento o falta de seguimiento en acudir a citas médicas, psicológicas o UDAI derivadas por el DECE.",
    defaultLegalFramework: `En consideración a lo estipulado en la Ley Orgánica de Educación Intercultural (LOEI) en su Artículo 13 (literales “f”, “g”) relativo a la obligación de acudir a las valoraciones externas y dar cumplimiento a los requerimientos de salud y bienestar del estudiante; Código de la Niñez y Adolescencia (CONNA) Artículo 27 sobre el derecho prioritario a la salud integral, física y psicológica, y Artículo 39 numeral 3 (garantizar atención médica y terapéutica oportuna); y Reglamento General a la LOEI.`,
    defaultRepresentativeCommitments: `1. Gestionar y acudir de forma prioritaria a las citas médicas, psicológicas o neurológicas programadas en el centro de salud o entidad especializada.
2. Entregar al DECE los informes de valoración diagnóstica o certificados de atención médica/psicológica dentro de los plazos coordinados.
3. Cumplir responsablemente con los tratamientos, medicación o pautas terapéuticas externas prescritas por los profesionales de salud.
4. Mantener comunicación mensual con el DECE sobre la evolución y continuidad del tratamiento de mi representado/a.`,
    defaultDeceCommitments: `1. Facilitar las cartas de derivación interinstitucional oficiales dirigidas a los centros de salud, UDAI o entidades de protección.
2. Articular con el equipo docente las adaptaciones pedagógicas o medidas de flexibilidad académica que deriven de los diagnósticos externos.
3. Efectuar el seguimiento mensual a la concurrencia a las terapias y documentar la evolución en el expediente confidencial del caso.`,
  },

  SALUD_MENTAL: {
    type: "SALUD_MENTAL",
    label: "Salud Mental / Crisis Emocional / Riesgo Autolesivo",
    shortDescription: "Ansiedad, depresión, episodios de crisis, conductas autolesivas o desregulación emocional grave.",
    defaultLegalFramework: `En consideración a lo consagrado en la Ley Orgánica de Salud Mental (Arts. 1, 6, 10 y 16 sobre el derecho a la atención integral, oportuna, humanizada y prioritaria de NNA); Ley Orgánica de Educación Intercultural (LOEI) Artículo 13 (literales “f”, “g”, “h”) relativo a la corresponsabilidad de velar por la salud psicofísica integral del estudiante y acudir a las valoraciones especializadas; Código de la Niñez y Adolescencia (CONNA) Artículo 27 (derecho a la salud integral física y mental) y Artículo 39 numeral 3; Constitución de la República del Ecuador (Arts. 35 y 44); y los Protocolos de Actuación Frente a Situaciones de Alerta de Suicidio y Autolesiones en el Sistema Educativo Nacional.`,
    defaultRepresentativeCommitments: `1. Gestionar de manera urgente e inaplazable la atención médica, psiquiátrica y/o psicológica especializada en el Ministerio de Salud Pública (MSP) o profesional facultado.
2. Presentar en el DECE el informe de valoración o certificado de atención y adherencia al tratamiento en un plazo no mayor a 5 días laborables.
3. Brindar acompañamiento continuo y contención afectiva en el hogar, retirando del alcance cualquier elemento de riesgo y manteniendo supervisión permanente.
4. Mantener comunicación inmediata y fluida con el DECE ante cualquier cambio significativo en el estado emocional, verbalizaciones o conducta de mi representado/a.`,
    defaultDeceCommitments: `1. Emitir la derivación oficial prioritaria a la Red Pública Integral de Salud (MSP) o entidades de atención psiquiátrica/psicológica.
2. Proporcionar primeros auxilios psicológicos, escucha activa y contención emocional dentro de las competencias institucionales.
3. Articular con el equipo docente medidas de apoyo socioemocional, entorno seguro, confidencialidad y flexibilidad académica y evaluativa.`,
  },

  VULNERABILIDAD_MEDICA: {
    type: "VULNERABILIDAD_MEDICA",
    label: "Vulnerabilidad Médica / Problemas de Salud Física",
    shortDescription: "Enfermedades crónicas, catastróficas, tratamientos médicos prolongados, convalecencia o cuidados especiales.",
    defaultLegalFramework: `En consideración a lo dispuesto en la Constitución de la República del Ecuador, Artículos 35 y 44 (atención prioritaria y especializada a personas con enfermedades complejas o catastróficas y NNA); Ley Orgánica de Educación Intercultural (LOEI) Artículo 13 (literales “g”, “h”) sobre el deber parental de garantizar el cuidado integral de la salud; Reglamento General a la LOEI sobre el programa de atención educativa a estudiantes en situación de enfermedad o reposo médico prolongado; y Código de la Niñez y Adolescencia (CONNA) Artículo 27 (derecho a la salud integral).`,
    defaultRepresentativeCommitments: `1. Entregar al DECE e Inspección los certificados médicos actualizados emitidos o validados por el MSP o IESS con diagnóstico claro, indicaciones y prescripciones.
2. Informar oportunamente al DECE sobre la administración de medicamentos, citas de control, signos de alarma o consideraciones especiales en el aula.
3. Garantizar el cumplimiento del tratamiento médico, reposo y cuidados indicados por los facultativos de la salud.
4. Coordinar con los docentes tutores la recepción y entrega de tareas durante los periodos de reposo médico justificado.`,
    defaultDeceCommitments: `1. Notificar de forma reservada y técnica a los docentes de aula sobre las consideraciones médicas, restricciones físicas o signos de alarma.
2. Coordinar con el vicerrectorado y docentes la flexibilización de plazos y adaptaciones pedagógicas no significativas requeridas por su condición de salud.
3. Realizar seguimiento periódico a la reincorporación y bienestar del estudiante en el entorno escolar.`,
  },

  HURTOS: {
    type: "HURTOS",
    label: "Hurtos / Apropiación Indebida de Bienes Ajenos",
    shortDescription: "Sustracción, tenencia no autorizada u ocultamiento de objetos, prendas, útiles o dinero ajenos en la institución.",
    defaultLegalFramework: `En cumplimiento de la Ley Orgánica de Educación Intercultural (LOEI) en el Artículo 13 (literales “c”, “d”, “e”) referente a la obligación de la familia de inculcar principios de honestidad, respeto al prójimo y cuidado del patrimonio institucional y ajeno; Artículos 132 y 134 de la LOEI sobre el régimen disciplinario y faltas a la convivencia escolar; Acuerdo Ministerial MINEDUC-2023-00008-A referente a la resolución pacífica de conflictos y prácticas restaurativas; y Código de la Niñez y Adolescencia (CONNA) Artículo 39 numerales 1 y 5.`,
    defaultRepresentativeCommitments: `1. Realizar de manera inmediata la devolución o restitución integral del bien u objeto sustraído a su legítimo propietario, o la reparación del perjuicio ocasionado.
2. Dialogar en el hogar con mi representado/a sobre la honestidad, el respeto a la propiedad ajena y las consecuencias morales y legales de estas conductas.
3. Revisar diariamente la mochila y pertenencias del estudiante al salir y regresar del establecimiento educativo.
4. Asistir a las sesiones de acompañamiento psicopedagógico y Escuela para Familias convocadas por el DECE.`,
    defaultDeceCommitments: `1. Desarrollar un proceso reflexivo y de mediación restaurativa con el estudiante para fomentar la empatía, asunción de responsabilidad y reparación del daño.
2. Brindar orientación individual enfocada en el fortalecimiento de valores, manejo de impulsos y autorregulación.
3. Mantener coordinación preventiva y seguimiento con la Inspección General evitando cualquier acto de estigmatización.`,
  },

  MAL_USO_UNIFORME: {
    type: "MAL_USO_UNIFORME",
    label: "Mal Uso del Uniforme Institucional / Código de Vestimenta",
    shortDescription: "Porte inadecuado, incompleto o alterado del uniforme escolar, uso indebido fuera del plantel o desinterés reiterado.",
    defaultLegalFramework: `De conformidad con la Ley Orgánica de Educación Intercultural (LOEI) Artículo 13 (literales “b”, “c”) sobre la corresponsabilidad de los representantes legales en el acatamiento de las normativas internas y código de convivencia institucional; Artículos 132 y 134 de la LOEI respecto a los deberes estudiantiles; Acuerdo Ministerial MINEDUC-2023-00008-A referente al fomento de la convivencia armónica e identidad institucional sin menoscabo del derecho a la educación; y el Código de Convivencia Institucional aprobado por la comunidad educativa.`,
    defaultRepresentativeCommitments: `1. Proveer y constatar diariamente que mi representado/a asista a la jornada escolar con el uniforme institucional oficial correspondiente (parada, diario o educación física), limpio, completo y en adecuado estado.
2. Concientizar a mi representado/a sobre el respeto y decoro al portar los símbolos e insignias de la institución tanto dentro del plantel como en la vía pública.
3. Justificar personalmente ante Inspección General en caso fortuito o excepcional de deterioro de la vestimenta, estableciendo un plazo prudencial de solución.
4. No permitir la alteración, corte o modificación indebida de las prendas del uniforme oficial.`,
    defaultDeceCommitments: `1. Indagar psicosocialmente si el incumplimiento del uniforme obedece a situaciones de precariedad socioeconómica familiar o dificultades personales.
2. Coordinar con Inspección y tutor para canalizar apoyos solidarios o acuerdos razonables en caso de vulnerabilidad económica comprobada.
3. Promover espacios de reflexión y sentido de pertenencia con el estudiante y su grupo de pares.`,
  },

  MAL_USO_REDES_SOCIALES: {
    type: "MAL_USO_REDES_SOCIALES",
    label: "Mal Uso de Redes Sociales / Stickers, Memes y Difusión no Autorizada",
    shortDescription: "Creación, edición o difusión en redes sociales o mensajería de stickers, memes, fotos o videos no autorizados o denigrantes.",
    defaultLegalFramework: `En consideración a lo consagrado en la Constitución de la República del Ecuador, Artículo 66 numerales 18, 19 y 20 (derecho al honor, buen nombre, imagen propia y protección de datos de carácter personal); Ley Orgánica de Educación Intercultural (LOEI) Artículo 13 (literales “c”, “d”, “h”) que responsabiliza a los padres de supervisar el uso de tecnologías y prevenir la violencia digital; Artículos 132 y 134 de la LOEI sobre faltas muy graves por actos de difamación o vulneración a la integridad mediante medios informáticos; Código de la Niñez y Adolescencia (CONNA) Artículos 50 y 52 (prohibición de difundir contenidos que lesionen la dignidad e intimidad de NNA); Acuerdo Ministerial MINEDUC-2023-00008-A (Protocolos para la Convivencia Escolar y Prevención del Ciberacoso); y tipificaciones pertinentes del COIP relativas a la violación a la intimidad.`,
    defaultRepresentativeCommitments: `1. Supervisar de manera estricta y diaria el uso del teléfono móvil, redes sociales (WhatsApp, TikTok, Instagram, Facebook) y contenidos digitales de mi representado/a.
2. Exigir y verificar la eliminación inmediata de todo sticker, meme, video o archivo que vulnere la imagen, privacidad o dignidad de docentes o estudiantes.
3. Acompañar a mi representado/a en la realización de una disculpa formal y acción restaurativa hacia las personas agraviadas.
4. Establecer medidas parentales de control, horarios restringidos de navegación y retención domiciliaria del dispositivo si fuera necesario.`,
    defaultDeceCommitments: `1. Intervenir mediante mediación escolar restaurativa para contener el daño socioemocional generado en las personas afectadas.
2. Impartir orientación socioeducativa al estudiante sobre ciudadanía digital responsable, huella digital y consecuencias legales de la ciberviolencia.
3. Elaborar el informe de abordaje técnico para remitir a Inspección General y Autoridad Institucional según los protocolos de ciberacoso.`,
  },

  DISPOSITIVOS_NO_AUTORIZADOS: {
    type: "DISPOSITIVOS_NO_AUTORIZADOS",
    label: "Uso de Dispositivos Tecnológicos no Autorizados en Clase",
    shortDescription: "Uso de teléfonos celulares, audífonos o aparatos electrónicos en horas de clase sin autorización pedagógica del docente.",
    defaultLegalFramework: `De conformidad con el Acuerdo Ministerial Nro. MINEDUC-2017-00072-A y Acuerdo MINEDUC-2023-00008-A que regulan el uso de teléfonos celulares y dispositivos tecnológicos en las instituciones educativas, autorizándolos exclusivamente bajo supervisión y fines estrictamente pedagógicos; Ley Orgánica de Educación Intercultural (LOEI) Artículo 13 (literales “b”, “c”) referente al apoyo familiar en el cumplimiento de los reglamentos escolares; Artículos 132 y 134 de la LOEI sobre perturbación de actividades académicas; y el Código de Convivencia Institucional.`,
    defaultRepresentativeCommitments: `1. Asegurar que mi representado/a no lleve dispositivos tecnológicos ni teléfonos celulares al aula a menos que exista requerimiento pedagógico escrito del docente.
2. En caso de portar el teléfono por seguridad en el trayecto, exigir que permanezca completamente apagado y guardado dentro de la mochila durante toda la jornada escolar.
3. Acudir personalmente a la institución a retirar el equipo en caso de retención por parte de Inspección General, aceptando las medidas formativas institucionales.
4. Reforzar en el hogar normas sobre desconexión tecnológica, concentración y respeto al tiempo de aprendizaje escolar.`,
    defaultDeceCommitments: `1. Brindar consejería formativa al estudiante sobre la concentración, autocontrol y uso responsable del tiempo escolar.
2. Orientar a la familia con pautas de crianza sobre límites de uso de pantallas y tecnología en el hogar.
3. Coordinar con Inspección General el cumplimiento formativo y preventivo de la normativa institucional.`,
  },

  CONDUCTAS_INAPROPIADAS_AULA: {
    type: "CONDUCTAS_INAPROPIADAS_AULA",
    label: "Conductas Inapropiadas dentro del Aula / Faltas a la Convivencia Áulica",
    shortDescription: "Interrupción recurrente de clases, desacato a directrices docentes, indisciplina, actitudes desafiantes o perturbación del aprendizaje.",
    defaultLegalFramework: `En consideración a la Ley Orgánica de Educación Intercultural (LOEI) Artículo 13 (literales “c”, “d”, “e”) sobre la obligación parental de inculcar el respeto a las autoridades y docentes, y apoyar la disciplina escolar; Artículos 132 y 134 de la LOEI sobre el régimen disciplinario y faltas por perturbación de las actividades académicas; Acuerdo Ministerial MINEDUC-2023-00008-A que promueve la disciplina positiva y la resolución pacífica de conflictos dentro del aula; Código de la Niñez y Adolescencia (CONNA) Artículo 39 numerales 1 y 5; y los Acuerdos y Compromisos de Convivencia de Aula.`,
    defaultRepresentativeCommitments: `1. Dialogar diariamente con mi representado/a sobre la importancia de atender a los docentes, acatar las instrucciones pedagógicas y respetar el derecho a estudiar de sus compañeros.
2. Realizar el seguimiento semanal al reporte de conducta y cumplimiento de acuerdos áulicos coordinado con el docente tutor.
3. Asistir puntualmente a las entrevistas convocadas por los docentes de asignatura e Inspección General.
4. Respaldar desde el hogar las medidas formativas y acuerdos reparatorios establecidos en el aula de clases.`,
    defaultDeceCommitments: `1. Realizar observaciones áulicas técnicas y entrevistas individuales con el estudiante para detectar causas subyacentes a la conducta disruptiva.
2. Desarrollar un plan de acompañamiento psicosocial enfocado en habilidades blandas, escucha activa y autorregulación conductual.
3. Asesorar al equipo docente en estrategias de manejo de aula positiva y técnicas de refuerzo conductual positivo.`,
  },

  OTRO: {
    type: "OTRO",
    label: "Otro Conflicto / Corresponsabilidad General",
    shortDescription: "Cualquier otra situación que amerite acuerdo formal entre el DECE y la familia.",
    defaultLegalFramework: `Se realiza la atención y valoración integral, llegando a los siguientes acuerdos y compromisos por el bienestar del estudiante, en consideración a lo que menciona en la LOEI, en el Artículo 13 (inciso “a” - “k”) referente a las obligaciones de las madres, padres y/o representantes legales. CONNA, Artículo 39 obligaciones de los progenitores, Art 29 y 39.- derechos y deberes de los progenitores con relación al derecho a la educación (numeral 1 al 8); y Código de Convivencia Institucional.`,
    defaultRepresentativeCommitments: `1. Asistir de manera puntual y regular a los llamados efectuados por el DECE, directivos y docentes tutores.
2. Supervisar en el hogar las responsabilidades académicas, conductuales y personales de mi representado/a.
3. Comunicar oportunamente a la institución cualquier situación extraordinaria que pueda incidir en el bienestar del estudiante.`,
    defaultDeceCommitments: `1. Proporcionar acompañamiento y orientación psicosocial periódica al estudiante y a su núcleo familiar.
2. Realizar seguimiento articulado con los docentes del curso para velar por el bienestar integral del estudiante.
3. Evaluar el cumplimiento de los acuerdos establecidos en el presente instrumento.`,
  },
};

export const STANDARD_CLOSING_CLAUSE_1 =
  "Los compromisos aquí establecidos se realizan sin perjuicio de los procedimientos comportamentales y académicos a los que hubiere lugar.";

export const STANDARD_CLOSING_CLAUSE_2 =
  "Por su parte el profesional DECE se compromete a brindar el contingente y seguimiento necesario al estudiante, según sus competencias, mientras se encuentre dentro del sistema educativo. Una vez dada lectura del acta y en acuerdo de la misma se procede a firmarla tomando en consideración que al no cumplir con los compromisos establecidos se procederá a enviar el caso a instancias pertinentes.";

export function buildCorresponsibilityAppearanceText(opts: {
  city?: string;
  date?: string;
  time?: string;
  representativeName: string;
  representativeIdNum?: string | null;
  studentName: string;
  studentGrade: string;
  studentParallel?: string | null;
  jornada?: string | null;
}): string {
  const city = opts.city || "Ambato";
  const now = opts.date ? new Date(opts.date + "T12:00:00") : new Date();
  const day = now.getDate();
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  const timeStr = opts.time || "09:00";

  const courseStr = `${opts.studentGrade || ""} ${opts.studentParallel || ""}`.trim() || "el curso correspondiente";
  const repName = opts.representativeName || "el/la representante legal";
  const repId = opts.representativeIdNum ? `con CI ${opts.representativeIdNum}` : "con CI ..............................";
  const studName = opts.studentName || "el/la estudiante";
  const jornadaStr = opts.jornada ? `Jornada ${opts.jornada}` : "Jornada M ( ) V ( )";

  return `En ${city} a los: ${day} días del mes de ${monthName} de ${year} siendo las: ${timeStr} H, Yo ${repName} ${repId} en calidad de representante legal del/la estudiante ${studName} que cursa el ${courseStr} ${jornadaStr} en presencia del/la profesional del Departamento de Consejería Estudiantil. Mediante presente documento hago constar que conozco:`;
}
