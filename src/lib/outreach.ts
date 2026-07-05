// Общие данные аутрич-CRM. Чистый модуль (без prisma/claude) — можно
// импортировать и на клиенте, и в API.

export const OUTREACH_STAGES: [string, string][] = [
  ["PROSPECT", "Найден"],
  ["CONTACTED", "Написал"],
  ["REPLIED", "Ответили"],
  ["MEETING", "Созвон"],
  ["IN_PROCESS", "В процессе"],
  ["WON", "Оффер"],
  ["LOST", "Отказ / тишина"],
];

export function stageLabel(stage: string) {
  return OUTREACH_STAGES.find(([id]) => id === stage)?.[1] ?? stage;
}

export type OutreachInput = {
  company: string;
  contactName?: string | null;
  contactRole?: string | null;
  domain?: string | null;
};

// Промпт для холодного письма основателю / Head of Product.
export function buildOutreachPrompt(o: OutreachInput, cases: string, lang: "en" | "ru") {
  const langRules =
    lang === "en"
      ? `- Write in ENGLISH.
- 500–800 characters. Cold outreach to a founder / hiring lead at a startup.
- Subject line first (line "Subject: ..."), then the email body.`
      : `- Пиши на РУССКОМ.
- 500–800 знаков. Холодное письмо основателю / нанимающему в стартапе.
- Сначала строка «Тема: ...», затем тело письма.`;

  const rules = `Ты пишешь ХОЛОДНОЕ письмо-аутрич от кандидата (Product Owner / Technical PM, умеет и в продукт, и в код) напрямую основателю или Head of Product компании. Цель — не «дайте работу», а показать релевантность и позвать на короткий созвон.
${langRules}
- Зацепи компанию: 1 фраза, почему именно она (домен/продукт), без лести.
- Вставь ОДИН самый релевантный кейс кандидата из блока «Кейсы» — с конкретным результатом в цифрах.
- Тон: уверенный, коллега-коллеге, без канцелярита и клише («стрессоустойчивый» и т.п.).
- Не выдумывай факты о кандидате — бери только из блока «Кейсы». Если кейсов нет, оставь плейсхолдер [твой кейс].
- Закончи мягким ясным CTA: 15-минутный созвон.
- Верни ТОЛЬКО тему и текст письма, без пояснений и markdown.`;

  const target = [
    `Компания: ${o.company}`,
    o.domain ? `Домен: ${o.domain}` : "",
    o.contactRole ? `Кому: ${o.contactRole}` : "",
    o.contactName ? `Имя контакта: ${o.contactName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${rules}

=== Кому пишем ===
${target}

=== Кейсы кандидата ===
${cases.trim() || "(кейсы не заданы — используй плейсхолдеры [кейс], [результат в цифрах])"}`;
}
