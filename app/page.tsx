import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import App from "@/components/App";

export default async function Home() {
  if (!(await getUserId())) redirect("/login");
  return <App />;
}
