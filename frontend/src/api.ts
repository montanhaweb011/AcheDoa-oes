export let csrf = "";
export async function api(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<any> {
  const r = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r
    .json()
    .catch(() => ({
      error:
        "Servidor indisponível. Confira se o backend está em execução e tente novamente.",
    }));
  if (!r.ok)
    throw new Error(data.error || "Não foi possível carregar os dados");
  if (data.csrf) csrf = data.csrf;
  return data;
}
