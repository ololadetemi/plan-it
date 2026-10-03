import AuthForm from "../AuthForm";
export default function Page() {
  return <AuthForm endpoint="/api/auth/login" title="Plan-it" sub="Sign in to your planner." button="Sign in" fields={["email","password"]}
    links={[["/signup","Create an account"],["/forgot","Forgot password?"]]} />;
}
