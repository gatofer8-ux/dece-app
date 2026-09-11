import LoginForm from "./LoginForm";
import SadexLogo from "@/components/SadexLogo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <SadexLogo variant="full" size="xl" theme="dark" showSubtitle={true} />
          <p className="text-cyan-200 text-xs mt-2 font-medium tracking-wide">
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
