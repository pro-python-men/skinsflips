import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  const store = await cookies();
  const token = store.get("token")?.value;
  redirect(token ? "/dashboard" : "/login");
}
