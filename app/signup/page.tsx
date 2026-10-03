import AuthForm from "../AuthForm";
export default function Page() {
  return <AuthForm endpoint="/api/auth/signup" title="Plan-it" sub="Create your account." button="Create account" fields={["email","password"]}
    links={[["/login","I already have an account"]]} />;
}
