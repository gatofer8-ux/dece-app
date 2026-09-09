"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await signOut({ redirect: false });
        window.location.href = "/login";
      }}
      className="text-sm text-slate-500 hover:text-red-600 transition-colors"
    >
      Cerrar sesión
    </button>
  );
}
