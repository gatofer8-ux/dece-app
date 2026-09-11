import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import PrintButton from "@/components/PrintButton";
import {
  ARCHETYPE_COUNT,
  MIN_IDENTIFIED,
  MIN_GROUPS,
  MAX_GROUPS,
  TAPAS_FAMILIES,
  TAPAS_SOURCE,
  type TapasFamily,
} from "@/lib/tapas/archetypes";

export const metadata = { title: "Manual de implementación — Juego de arquetipos" };

export default async function TapasManualPage() {
  await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);

  const h2 = "text-lg font-bold text-slate-900 mt-8 mb-2";
  const h3 = "text-sm font-bold text-slate-800 mt-5 mb-1.5 uppercase tracking-wide";
  const p = "text-sm text-slate-700 leading-relaxed mb-2";
  const li = "text-sm text-slate-700 leading-relaxed";

  return (
    <div className="space-y-4">
      <div className="no-print">
        <PageHeader
          title="Manual de implementación del juego de arquetipos (TaPas)"
          description="Guía didáctica para el equipo DECE: el enfoque del Proyecto TaPas y cómo aplicar el juego con la plataforma, en masa."
          action={
            <div className="flex items-center gap-2">
              <Link href="/tapas" className="btn-secondary text-xs">← Volver</Link>
              <PrintButton hideWordButton />
            </div>
          }
        />
      </div>

      <article id="printable-content" className="card p-6 sm:p-8 max-w-3xl print:border-0 print:shadow-none">
        <style>{`@media print { @page { size: A4; margin: 1.6cm; } .card { padding: 0 } }`}</style>

        <h1 className="text-2xl font-bold text-slate-900">Juego de arquetipos TaPas — Manual de implementación</h1>
        <p className="text-xs text-slate-500 mt-1">
          Herramienta de Orientación Vocacional y Profesional. Uso interno del Departamento de Consejería Estudiantil.
        </p>

        {/* ---------------------------------------------------------------- */}
        <h2 className={h2}>1. Qué es el Proyecto TaPas</h2>
        <p className={p}>
          TaPas (Talentos + Pasiones) es un enfoque de acompañamiento que centra el proceso educativo en lo que cada
          estudiante <strong>hace bien y disfruta hacer</strong>, en lugar de mirarlo solo por lo que le cuesta. Parte
          de una idea sencilla: toda persona tiene una combinación única de talentos y pasiones con la que puede
          distinguirse, y ese autoconocimiento lleva a mejores decisiones de estudio y de vida.
        </p>
        <p className={p}>
          Para TaPas, un <strong>talento</strong> es la capacidad de hacer ciertas cosas más rápido, mejor y con menos
          esfuerzo que otras personas; se compone de varias habilidades que se usan a la vez. La <strong>pasión</strong>{" "}
          es la energía interna que mueve ese talento. Talento y pasión van siempre juntos: sin la pasión, la habilidad
          se practica «en frío» y rinde menos.
        </p>

        <h3 className={h3}>Ideas clave para conversar con el estudiante</h3>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li className={li}>
            <strong>Talento ≠ una sola habilidad.</strong> «Ser bueno para escribir» no dice mucho; escribir + imaginar
            + empatizar con la niñez = talento para escribir cuentos infantiles. Ayuda a que identifique la mezcla.
          </li>
          <li className={li}>
            <strong>Los talentos cambian y crecen</strong>, sobre todo en la adolescencia. Conviene no «etiquetar» a
            nadie de forma fija. Un talento se desarrolla con oportunidad, disciplina y enfoque.
          </li>
          <li className={li}>
            <strong>Mentalidad de crecimiento.</strong> La retroalimentación se centra en lo aprendido y en cómo
            mejorar, no en el resultado. El error es información, no una sentencia.
          </li>
          <li className={li}>
            El reconocimiento de talentos, pasiones e intereses alimenta la <strong>dimensión de autoconocimiento</strong>{" "}
            del Proyecto de Vida (junto con información y toma de decisiones).
          </li>
        </ul>

        {/* ---------------------------------------------------------------- */}
        <h2 className={h2}>2. El juego de arquetipos</h2>
        <p className={p}>
          Un <strong>arquetipo</strong> es un rol o figura (médico/a, inventor/a, guía, rebelde…) cuyo valor no está en
          la imagen sino en lo que representa para cada persona. En el juego, el estudiante revisa un mazo de{" "}
          <strong>{ARCHETYPE_COUNT} arquetipos</strong> y se pregunta: ¿me identifico con esto?, ¿qué haría yo en ese
          rol?, ¿cumplir ese rol me haría sentir más seguro/a de mí? Al final obtiene un <strong>perfil de talentos</strong>{" "}
          propio, agrupado y ordenado por él o ella.
        </p>
        <p className={p}>
          El juego responde a una pregunta central: <em>«¿Estoy decidiendo mi futuro con base en los talentos que me
          dan energía, o con base en lo que pienso o me dicen que hago bien?»</em>
        </p>

        <h3 className={h3}>Las 5 fases (versión digital)</h3>
        <ol className="list-decimal pl-5 space-y-1.5 mb-2">
          <li className={li}>
            <strong>Clasificar.</strong> El estudiante ve las {ARCHETYPE_COUNT} tarjetas una por una y elige «Me
            identifico», «Tengo dudas» o «No me identifico». Rápido y con sinceridad, sin sobrepensar.
          </li>
          <li className={li}>
            <strong>Ajuste.</strong> Si tiene menos de {MIN_IDENTIFIED} tarjetas en «Me identifico», promueve algunas de
            «Tengo dudas» hasta llegar a {MIN_IDENTIFIED} (regla del manual original).
          </li>
          <li className={li}>
            <strong>Agrupar.</strong> Junta las tarjetas afines en <strong>{MIN_GROUPS} a {MAX_GROUPS} grupos</strong> y
            le pone a cada grupo un nombre que empiece con un <strong>verbo</strong> (p. ej. «Proteger la justicia»,
            «Crear e imaginar»). La plataforma tiene un botón de IA que sugiere el nombre.
          </li>
          <li className={li}>
            <strong>Ordenar.</strong> Coloca sus grupos del talento que siente más fuerte al menos fuerte.
          </li>
          <li className={li}>
            <strong>Cierre.</strong> Escribe qué descubrió y cómo se conecta con lo que quiere estudiar o hacer, y una
            breve carta a su yo del futuro.
          </li>
        </ol>
        <p className={p}>
          En la versión física, este trabajo se hace en equipos de 3 o 4 estudiantes que se conocen bien: los
          compañeros sugieren incluir o quitar tarjetas según lo que ven en la persona. En la versión digital cada
          estudiante lo hace en su dispositivo, pero se recomienda mantener el trabajo en grupos para conservar esa
          mirada de los pares (por ejemplo, sentados juntos, comentando entre ellos).
        </p>

        <h3 className={h3}>Familias de talento (lectura del DECE)</h3>
        <p className={p}>
          Para leer los resultados de un curso completo, la plataforma agrupa los arquetipos en seis familias. Son una
          ayuda de lectura; <strong>no reemplazan</strong> los grupos que arma el estudiante.
        </p>
        <ul className="list-disc pl-5 space-y-0.5 mb-2">
          {(Object.keys(TAPAS_FAMILIES) as TapasFamily[]).map((f) => (
            <li key={f} className={li}>
              {TAPAS_FAMILIES[f].emoji} <strong>{TAPAS_FAMILIES[f].label}</strong>
            </li>
          ))}
        </ul>

        {/* ---------------------------------------------------------------- */}
        <h2 className={h2}>3. A quién y cuándo aplicarlo</h2>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li className={li}>
            Recomendado desde <strong>2.º de Bachillerato</strong> en adelante, cuando la decisión de estudios o trabajo
            está cerca. También es útil en 10.º EGB como exploración temprana.
          </li>
          <li className={li}>
            Momentos ideales: inicio del año lectivo (para orientar), o antes de la elección de figura profesional /
            postulación a la educación superior.
          </li>
          <li className={li}>
            Encaja en el eje de <strong>promoción y prevención</strong> del DECE y en las actividades de OVP del plan
            anual.
          </li>
        </ul>

        {/* ---------------------------------------------------------------- */}
        <h2 className={h2}>4. Cómo aplicarlo con la plataforma, en masa</h2>

        <h3 className={h3}>Paso 1 — Preparación (una sola vez)</h3>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li className={li}>
            <strong>Cargar las cartillas.</strong> En <em>Juego de arquetipos → Cartillas</em>, sube el PDF oficial de
            «Tarjetas de arquetipos» del Proyecto TaPas (descarga gratuita en{" "}
            <span className="font-mono text-xs">ecuador.vvob.org/herramientas-TAPAS</span>). El sistema lo procesa en una
            imagen por arquetipo. Si no lo cargas, el juego usa íconos genéricos.
          </li>
          <li className={li}>
            <strong>Sesión previa de familiarización.</strong> Antes de jugar, revisa con el curso el significado de
            cada arquetipo (el «diccionario»). Se puede vincular con Lengua o Ciencias Sociales. Sin este paso, los
            resultados pierden calidad.
          </li>
        </ul>

        <h3 className={h3}>Paso 2 — Crear la aplicación para el curso</h3>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li className={li}>
            En <em>Juego de arquetipos → Nueva aplicación</em>, define título, curso, paralelo y jornada, y (opcional)
            fechas de apertura y cierre.
          </li>
          <li className={li}>
            Se genera un <strong>código de 6 letras</strong>, un <strong>enlace</strong> y un <strong>QR</strong>. Si
            definiste el curso, cada estudiante elige su nombre de la lista; si no, lo escribe.
          </li>
        </ul>

        <h3 className={h3}>Paso 3 — Aplicar (elige la modalidad según tus recursos)</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs my-2">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-300 p-2 text-left">Modalidad</th>
                <th className="border border-slate-300 p-2 text-left">Cuándo usarla</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr>
                <td className="border border-slate-300 p-2 font-semibold">Sala de cómputo</td>
                <td className="border border-slate-300 p-2">
                  Modalidad principal. El DECE o el tutor abre la sesión, los estudiantes entran con el QR y juegan
                  supervisados. Coordina turnos si hay menos equipos que estudiantes.
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-semibold">Teléfono del estudiante</td>
                <td className="border border-slate-300 p-2">
                  Página ligera, pensada para gama baja. Se puede pausar y retomar desde el mismo enlace. Útil como
                  tarea guiada si hay conectividad en casa.
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-semibold">Asistida / heteroaplicada</td>
                <td className="border border-slate-300 p-2">
                  Para estudiantes con dificultad lectora o sin autonomía: el tutor o el DECE lee las tarjetas y registra
                  las respuestas en un solo dispositivo, por turnos.
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-semibold">Proyección a toda la clase</td>
                <td className="border border-slate-300 p-2">
                  Con un solo equipo y proyector se muestran las tarjetas una a una y cada estudiante marca en una hoja;
                  luego se digitan. Sirve cuando no hay suficientes dispositivos.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li className={li}>Tiempo estimado: <strong>15 a 20 minutos</strong> por estudiante.</li>
          <li className={li}>
            El avance por estudiante y la distribución de familias del curso se ven en el detalle de la aplicación.
            Puedes cerrar y reabrir la aplicación cuando quieras.
          </li>
        </ul>

        {/* ---------------------------------------------------------------- */}
        <h2 className={h2}>5. Después del juego: leer y acompañar</h2>
        <ul className="list-disc pl-5 space-y-1.5 mb-2">
          <li className={li}>
            <strong>Revisar el perfil de cada estudiante</strong> (grupos rankeados, arquetipos, familias, reflexión).
            Descarga el <em>informe</em> para el expediente y el Proyecto de Vida.
          </li>
          <li className={li}>
            <strong>Entrevista de orientación.</strong> Con el estudiante, toma sus 2–3 grupos más fuertes e identifica
            entre <strong>5 y 10 áreas de estudio o campos ocupacionales</strong> relacionados; que elija <strong>3</strong>{" "}
            para explorar. La plataforma tiene un botón de IA que propone áreas a partir de sus grupos.
          </li>
          <li className={li}>
            <strong>Aterrizar en la realidad.</strong> Contrasta esas opciones con la oferta educativa cercana (colegio
            técnico, institutos tecnológicos públicos, formación dual, universidades), los costos y las becas. Recuerda
            que no siempre hace falta una carrera universitaria.
          </li>
          <li className={li}>
            <strong>Explorar los campos elegidos:</strong> conversaciones con personas que se dedican a ellos, videos
            del quehacer profesional, o un pequeño «experimento de talento» (probar la actividad durante una semana y
            registrar qué le dio energía y qué le costó).
          </li>
          <li className={li}>
            <strong>Cerrar con el Proyecto de Vida:</strong> que el estudiante escriba qué aspectos de sí salieron a la
            luz y cómo apoyan sus metas a corto, mediano y largo plazo.
          </li>
        </ul>

        <h3 className={h3}>Señales de alerta al leer resultados</h3>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li className={li}>
            <strong>Perfil muy disperso</strong> (grupos pequeños, sin un talento claro): priorizar autoconocimiento e
            información antes de la decisión.
          </li>
          <li className={li}>
            <strong>Pocos «me identifico»</strong> o respuestas apuradas: el estudiante puede estar poco implicado o aún
            explorando; conviene una segunda conversación.
          </li>
          <li className={li}>
            <strong>Choque</strong> entre el perfil y lo que la familia espera, o entre el interés y la oferta cercana:
            trabajarlo en la entrevista y, si aplica, con el representante.
          </li>
        </ul>

        {/* ---------------------------------------------------------------- */}
        <h2 className={h2}>6. Buenas prácticas</h2>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li className={li}>Insiste en que <strong>no hay respuestas correctas</strong>; lo que vale es la honestidad.</li>
          <li className={li}>No interpretes el perfil «por» el estudiante: acompáñalo a que lo lea él o ella.</li>
          <li className={li}>Evita etiquetar («tú eres de ciencias»): los talentos cambian.</li>
          <li className={li}>
            Guarda la confidencialidad de los resultados: son de uso del DECE y del propio estudiante (y su
            representante).
          </li>
          <li className={li}>Repite el ejercicio en años posteriores: el perfil se rediseña con el desarrollo.</li>
        </ul>

        <hr className="my-6 border-slate-200" />
        <p className="text-xs text-slate-500">
          Este manual sintetiza, para uso interno del DECE, el enfoque de la herramienta oficial. Fuente y créditos:{" "}
          {TAPAS_SOURCE} Las tres herramientas del proyecto (Perfil de talentos, Tarjetas de arquetipos y Experimento de
          talento) y su fundamento completo están en ese manual.
        </p>
      </article>
    </div>
  );
}
