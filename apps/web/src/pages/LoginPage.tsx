import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";

const credenciaisSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  senha: z.string().min(1, "Informe a senha"),
});
type CredenciaisForm = z.infer<typeof credenciaisSchema>;

const totpSchema = z.object({
  codigoTotp: z.string().length(6, "O código tem 6 dígitos"),
});
type TotpForm = z.infer<typeof totpSchema>;

export function LoginPage() {
  const { login, loginComTotp } = useAuth();
  const navigate = useNavigate();
  const [erro, setErro] = useState<string | null>(null);
  const [loginChallengeToken, setLoginChallengeToken] = useState<string | null>(null);

  const credenciaisForm = useForm<CredenciaisForm>({ resolver: zodResolver(credenciaisSchema) });
  const totpForm = useForm<TotpForm>({ resolver: zodResolver(totpSchema) });

  const onSubmitCredenciais = async (data: CredenciaisForm) => {
    setErro(null);
    try {
      const result = await login(data.email, data.senha);
      if (result.status === "2FA_REQUIRED") {
        setLoginChallengeToken(result.loginChallengeToken);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
    }
  };

  const onSubmitTotp = async (data: TotpForm) => {
    if (!loginChallengeToken) return;
    setErro(null);
    try {
      await loginComTotp(loginChallengeToken, data.codigoTotp);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Código inválido.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border border-ink-100 bg-white p-6 shadow-sm">
          {!loginChallengeToken ? (
            <form onSubmit={credenciaisForm.handleSubmit(onSubmitCredenciais)} className="space-y-4">
              <h1 className="text-base font-semibold text-ink-900">Entrar</h1>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  error={credenciaisForm.formState.errors.email?.message}
                  {...credenciaisForm.register("email")}
                />
              </div>
              <div>
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  error={credenciaisForm.formState.errors.senha?.message}
                  {...credenciaisForm.register("senha")}
                />
              </div>
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={credenciaisForm.formState.isSubmitting}
              >
                {credenciaisForm.formState.isSubmitting ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={totpForm.handleSubmit(onSubmitTotp)} className="space-y-4">
              <h1 className="text-base font-semibold text-ink-900">Verificação em duas etapas</h1>
              <p className="text-sm text-ink-500">
                Informe o código de 6 dígitos do seu aplicativo autenticador.
              </p>
              <div>
                <Label htmlFor="codigoTotp">Código</Label>
                <Input
                  id="codigoTotp"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  error={totpForm.formState.errors.codigoTotp?.message}
                  {...totpForm.register("codigoTotp")}
                />
              </div>
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <Button type="submit" className="w-full" disabled={totpForm.formState.isSubmitting}>
                {totpForm.formState.isSubmitting ? "Verificando…" : "Confirmar"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-ink-500 hover:text-ink-700"
                onClick={() => setLoginChallengeToken(null)}
              >
                Voltar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
