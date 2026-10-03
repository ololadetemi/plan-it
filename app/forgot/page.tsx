import AuthForm from "../AuthForm";
export default function Page() {
  return <AuthForm endpoint="/api/auth/forgot" title="Reset password" sub="Enter your email to get a reset link." button="Email me a reset link" fields={["email"]}
    done="If an account exists for that email, a reset link is on its way." links={[["/login","Back to sign in"]]} />;
}
