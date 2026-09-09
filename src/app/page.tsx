import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleHomePath } from "@/lib/permissions";

export default async function Home() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  redirect(roleHomePath(session.user.role));
}
