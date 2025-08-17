import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "src/lib/db";

export default function SetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState(""); 
  const [tokenError, setTokenError] = useState(""); 
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const invite_type = params.get("type");

      if (access_token && refresh_token && invite_type === "invite") {
        supabase.auth.setSession({ access_token, refresh_token }).then(async ({ error }) => {
          if (error) {
            setTokenError("El enlace de invitación no es válido o ya expiró. Solicita ayuda a tu administrador.");
            setReady(true);
          } else {
            setReady(true);
          }
        });
      } else {
        setTokenError("El enlace de invitación no es válido o ya expiró. Solicita ayuda a tu administrador.");
        setReady(true);
      }
    }
  }, []);

  const validatePassword = (pwd: string) => {
    // Reglas de tu backend: mínimo 8, mayúscula, número, símbolo
    if (pwd.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pwd)) return "Debe tener al menos una mayúscula.";
    if (!/\d/.test(pwd)) return "Debe tener al menos un número.";
    if (!/[!@#$%^&*]/.test(pwd)) return "Debe tener al menos un símbolo.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (password !== confirm) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }
    const pwdValidation = validatePassword(password);
    if (pwdValidation) {
      setFormError(pwdValidation);
      return;
    }
    // Si pasa las validaciones, recién ahí intentamos el updateUser
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (
        error.message?.toLowerCase().includes("expired") ||
        error.message?.toLowerCase().includes("invalid")
      ) {
        setTokenError("El enlace de invitación no es válido o ya expiró. Solicita ayuda a tu administrador.");
      } else {
        setFormError(error.message || "Error desconocido al establecer la contraseña.");
      }
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    }
  };

  if (!ready) return <div>Cargando invitación...</div>;

  return (
    <div className="max-w-md mx-auto p-8 mt-16 shadow-xl rounded-xl bg-white">
      <h1 className="text-2xl font-bold mb-4">Crea tu Contraseña</h1>
      {tokenError ? (
        <div className="text-red-500 mt-2">{tokenError}</div>
      ) : !success ? (
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input mb-3 w-full border rounded p-2"
            minLength={8}
            required
          />
          <input
            type="password"
            placeholder="Repetir contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="input mb-3 w-full border rounded p-2"
            minLength={8}
            required
          />
          {formError && <div className="text-red-500 mb-2">{formError}</div>}
          <button
            type="submit"
            className="btn btn-primary w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Guardar contraseña
          </button>
        </form>
      ) : (
        <div className="text-green-600 font-bold">
          ¡Contraseña guardada! Redirigiendo al login...
        </div>
      )}
    </div>
  );
}
