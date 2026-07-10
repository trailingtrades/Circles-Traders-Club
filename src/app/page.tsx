import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getStudentSession();
  redirect(session ? "/dashboard" : "/login");
}
