import AuthForm from "../AuthForm";
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthForm endpoint="/api/auth/reset" title="New password" sub="Choose a new password." button="Save new password" fields={["password"]} extra={{ token: token ?? "" }} />;
}
