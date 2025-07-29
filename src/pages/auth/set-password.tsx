import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/services/db";

export default function SetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  //Almacena token y tipo de invitación
  const [token, setToken] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

useEffect(() => {
  if (typeof window !== "undefined") {
    const hash = window.location.hash.replace("#", "");
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const invite_type = params.get("type");
    setToken(access_token);
    setType(invite_type);

    console.log("access_token", access_token);
    console.log("refresh_token", refresh_token);
    console.log("invite_type", invite_type);

    if (access_token && refresh_token && invite_type === "invite") {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          setError("Token inválido o expirado.");
          console.error("Supabase setSession error:", error);
        } else {
          setReady(true);
          //chequea que user esté seteado en supabase
          supabase.auth.getUser().then(({ data, error }) => {
            console.log("After setSession, user:", data?.user, error);
          });
        }
      });
    } else {
      setError("Invitación no válida o expirada.");
      setReady(true);
    }
  }
}, []);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    // Actualiza la contraseña usando el token de invitación
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    }
  };

  if (!ready) return <div>Cargando invitación...</div>;

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-md mx-auto p-8 mt-16 shadow-xl rounded-xl bg-white">
      <h1 className="text-2xl font-bold mb-4">Crea tu Contraseña</h1>
      {!success ? (
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
          {error && <div className="text-red-500 mb-2">{error}</div>}
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
