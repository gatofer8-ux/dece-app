import LoginForm from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white text-2xl font-bold mb-4">
            DECE
          </div>
          <h1 className="text-2xl font-bold text-white">Sistema de Gestión DECE</h1>
          <p className="text-brand-100 mt-1 text-sm">
            Departamento de Consejería Estudiantil
          </p>
        </div>
        <div className="card p-6">
          <LoginForm error={searchParams.error} />
        </div>
        <p className="text-center text-xs text-brand-100 mt-6">
          Acceso restringido al personal autorizado de la institución educativa.
          Toda actividad queda registrada en la bitácora de auditoría.
        </p>
      </div>
    </div>
  );
}
