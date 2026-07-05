const API = "https://api.hh.ru";

function userAgent() {
  return process.env.HH_USER_AGENT ?? "hirebot/1.0";
}

// ---------- Авторизация ----------
//
// API соискателей hh (OAuth-вход соискателя, отклики через /negotiations, свои
// резюме) закрыт 15 декабря 2025. Поиск вакансий (/vacancies) теперь тоже требует
// авторизацию, но на уровне ПРИЛОЖЕНИЯ (grant_type=client_credentials) — этот
// поток жив, не относится к API соискателей и НЕ требует ngrok/redirect.
// Нужны только HH_CLIENT_ID и HH_CLIENT_SECRET (приложение на dev.hh.ru).

let appToken: { value: string; expiresAt: number } | null = null;

async function fetchAppToken(): Promise<string> {
  const clientId = process.env.HH_CLIENT_ID;
  const clientSecret = process.env.HH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new HhApiError(
      401,
      "Не заданы HH_CLIENT_ID / HH_CLIENT_SECRET в .env. Зарегистрируй приложение на dev.hh.ru и впиши их — этого достаточно для поиска (ngrok не нужен)."
    );
  }
  const res = await fetch(`${API}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "HH-User-Agent": userAgent(),
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new HhApiError(res.status, await res.text());
  const data = (await res.json()) as { access_token: string; expires_in: number };
  appToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function accessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && appToken && Date.now() < appToken.expiresAt - 60_000) {
    return appToken.value;
  }
  return fetchAppToken();
}

// ---------- API ----------

export class HhApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`hh API ${status}: ${body}`);
  }
}

async function hhJson(path: string) {
  const doFetch = (token: string) =>
    fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "HH-User-Agent": userAgent(),
      },
    });

  let res = await doFetch(await accessToken());
  if (res.status === 403 || res.status === 401) {
    // токен приложения мог протухнуть — одна попытка с новым
    res = await doFetch(await accessToken(true));
  }
  if (!res.ok) throw new HhApiError(res.status, await res.text());
  return res.json();
}

export type HhVacancy = {
  id: string;
  name: string;
  employer?: { id?: string; name?: string };
  area?: { name?: string };
  salary?: { from?: number; to?: number; currency?: string } | null;
  alternate_url: string;
  snippet?: { requirement?: string; responsibility?: string };
  published_at?: string;
  has_test?: boolean;
  description?: string;
  key_skills?: { name: string }[];
};

export async function searchVacancies(params: {
  text: string;
  area?: string;
  salary?: number;
  onlyWithSalary?: boolean;
  remote?: boolean;
  page?: number;
  perPage?: number;
}): Promise<{ items: HhVacancy[]; found: number; pages: number }> {
  const q = new URLSearchParams({
    text: params.text,
    page: String(params.page ?? 0),
    per_page: String(params.perPage ?? 50),
    order_by: "publication_time",
  });
  if (params.area) q.set("area", params.area);
  if (params.salary) q.set("salary", String(params.salary));
  if (params.onlyWithSalary) q.set("only_with_salary", "true");
  if (params.remote) q.set("schedule", "remote");
  return hhJson(`/vacancies?${q}`);
}

export async function getVacancy(id: string): Promise<HhVacancy> {
  return hhJson(`/vacancies/${id}`);
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
