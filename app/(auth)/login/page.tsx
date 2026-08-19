import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in",
};

type Props = {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return <LoginForm redirectTo={params.redirectTo} oauthError={params.error} />;
}
