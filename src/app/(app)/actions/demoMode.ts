"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function enterDemoModeAction() {
  const cookieStore = cookies();
  cookieStore.set("dece_demo_institution", "demo-los-alamos", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function exitDemoModeAction() {
  const cookieStore = cookies();
  cookieStore.delete("dece_demo_institution");
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
