import { prisma } from "./db";

const API = "https://api.hh.ru";

function userAgent() {
  return process.env.HH_USER_AGENT ?? "hirebot/1.0";
}

// ---------- OAuth ----------

export function hhAuthUrl() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.HH_CLIENT_ID ?? "",
    redirect_uri: process.env.HH_REDIRECT_URI ?? "",
  });
  return `https://hh.ru/oauth/authorize?${params}`;
}

async function saveTokens(data: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}) {
  const expiresAt = Date.now() + data.expires_in * 1000;
  const entries: [string, string][] = [
    ["hh_access_token", data.access_token],
    ["hh_refresh_token", data.refresh_token],
    ["hh_token_expires_at", String(expiresAt)],
  ];
  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

async function getSetting(key: string) {
  return (await prisma.setting.findUnique({ where: { key } }))?.value ?? null;
}

export async function isHhConnected() {
  return Boolean(await getSetting("hh_access_token"));
}

async function tokenRequest(body: URLSearchParams) {
  const res = await fetch(`${API}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "HH-User-Agent": userAgent(),
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`hh token error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function exchangeCode(code: string) {
  const data = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.HH_CLIENT_ID ?? "",
      client_secret: process.env.HH_CLIENT_SECRET ?? "",
      code,
      redirect_uri: process.env.HH_REDIRECT_URI ?? "",
    })
  );
  await saveTokens(data);
}

async function refreshTokens() {
  const refreshToken = await getSetting("hh_refresh_token");
  if (!refreshToken) throw new Error("hh.ru не подключён — нет refresh token");
  const data = await tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })
  );
  await saveTokens(data);
  return data.access_token as string;
}

async function accessToken() {
  const token = await getSetting("hh_access_token");
  if (!token) throw new Error("hh.ru не подключён — авторизуйся в настройках");
  const expiresAt = Number(await getSetting("hh_token_expires_at"));
  if (expiresAt && Date.now() > expiresAt - 60_000) {
    return refreshTokens();
  }
  return token;
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

async function hhFetch(path: string, init: RequestInit = {}) {
  let token = await accessToken();
  const doFetch = (t: string) =>
    fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${t}`,
        "HH-User-Agent": userAgent(),
        ...init.headers,
      },
    });
  let res = await doFetch(token);
  if (res.status === 403) {
    // возможно истёк токен — одна попытка refresh
    token = await refreshTokens();
    res = await doFetch(token);
  }
  return res;
}

async function hhJson(path: string, init: RequestInit = {}) {
  const res = await hhFetch(path, init);
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

export async function getMyResumes(): Promise<{
  items: { id: string; title: string }[];
}> {
  return hhJson(`/resumes/mine`);
}

// Отклик на вакансию. Возвращает id переговоров (negotiation) если hh его отдал.
export async function applyToVacancy(
  vacancyId: string,
  resumeId: string,
  message: string
): Promise<string | null> {
  const form = new FormData();
  form.set("vacancy_id", vacancyId);
  form.set("resume_id", resumeId);
  form.set("message", message);
  const res = await hhFetch(`/negotiations`, { method: "POST", body: form });
  if (!res.ok) throw new HhApiError(res.status, await res.text());
  // hh возвращает 201 с Location: /negotiations/{id}
  const location = res.headers.get("location") ?? "";
  const match = location.match(/negotiations\/(.+)$/);
  return match ? match[1] : null;
}

export type HhNegotiation = {
  id: string;
  state: { id: string }; // response | invitation | discard
  vacancy?: { id: string };
  viewed_by_opponent?: boolean;
  updated_at?: string;
};

export async function getNegotiations(
  page = 0
): Promise<{ items: HhNegotiation[]; pages: number }> {
  return hhJson(`/negotiations?per_page=100&page=${page}&order_by=updated_at`);
}

// «Поднять» резюме в выдаче (hh разрешает раз в 4 часа)
export async function touchResume(resumeId: string) {
  const res = await hhFetch(`/resumes/${resumeId}/publish`, { method: "POST" });
  if (!res.ok && res.status !== 429) {
    throw new HhApiError(res.status, await res.text());
  }
  return res.ok;
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
