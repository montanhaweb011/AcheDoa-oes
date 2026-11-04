export let csrf = "";

export async function api(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<any> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(
      "Não foi possível conectar à API. Verifique se o servidor está disponível.",
    );
  }

  // Sem o backend configurado, um fallback de SPA pode devolver index.html
  // com HTTP 200. Tratar esse HTML como dados causava uma exceção no React
  // (data.items era indefinido), deixando a página completamente branca.
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("json")) {
    throw new Error(
      "A API ainda não está conectada. O site pode ser visualizado, mas pontos de coleta, login e cadastros exigem o backend configurado.",
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error("A API retornou uma resposta inválida. Tente novamente.");
  }

  if (!response.ok) {
    throw new Error(data?.error || "Não foi possível carregar os dados.");
  }
  if (data?.csrf) csrf = data.csrf;
  return data;
}
