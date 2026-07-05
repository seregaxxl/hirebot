import type { HhVacancy } from "./hh";
import { stripHtml } from "./hh";
import { runClaude } from "./claude";

export function renderTemplate(
  body: string,
  vars: { position: string; company: string }
) {
  return body
    .replaceAll("{position}", vars.position)
    .replaceAll("{company}", vars.company);
}

export const DEFAULT_TEMPLATE = `Здравствуйте!

Меня заинтересовала вакансия «{position}» в компании {company}. Мой опыт управления проектами и продуктами напрямую совпадает с задачами из описания.

Буду рад рассказать подробнее на коротком созвоне — когда вам удобно?`;

const LETTER_RULES = `Ты пишешь сопроводительное письмо для отклика на вакансию на hh.ru от имени кандидата.
Требования к письму:
- Русский язык, 500–900 знаков, деловой но живой тон, без канцелярита.
- Начни с приветствия, назови вакансию и компанию.
- Возьми 2–3 конкретные боли/задачи из описания вакансии и покажи, как опыт кандидата их закрывает.
- Запрещены клише: «стрессоустойчивый», «коммуникабельный», «командный игрок», «быстро обучаюсь».
- Не выдумывай факты о кандидате, опирайся только на название его резюме и общий опыт руководителя проектов/продукта.
- Закончи коротким призывом к действию (созвон/интервью).
- Верни ТОЛЬКО текст письма, без пояснений, без markdown.`;

// Персональное письмо под вакансию. Возвращает null, если Claude недоступен.
export async function generateLetterLLM(
  vacancy: HhVacancy,
  resumeTitle: string,
  styleHint?: string
): Promise<string | null> {
  const description = stripHtml(vacancy.description ?? "").slice(0, 4000);
  const skills = (vacancy.key_skills ?? []).map((s) => s.name).join(", ");

  const prompt = `${LETTER_RULES}${styleHint ? `\nДополнительно: ${styleHint}` : ""}

Вакансия: ${vacancy.name}
Компания: ${vacancy.employer?.name ?? "не указана"}
Ключевые навыки: ${skills || "не указаны"}
Резюме кандидата: ${resumeTitle}

Описание вакансии:
${description}`;

  // письмо должно быть содержательным — отсекаем слишком короткие ответы
  return runClaude(prompt, { minLength: 100 });
}

// ---------- Чеклист качества письма ----------

export type ChecklistItem = { check: string; pass: boolean; hint: string };

const CLICHES = [
  "стрессоустойчив",
  "коммуникабельн",
  "командный игрок",
  "быстро обуча",
  "ответственн",
  "целеустремл",
];

export function checkLetter(letter: string, vacancy: HhVacancy): ChecklistItem[] {
  const lower = letter.toLowerCase();
  const company = (vacancy.employer?.name ?? "").toLowerCase();
  const titleWords = vacancy.name
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((w) => w.length > 3);
  const skills = (vacancy.key_skills ?? []).map((s) => s.name.toLowerCase());
  const matchedSkills = skills.filter((s) => lower.includes(s));

  return [
    {
      check: "Длина 350–1500 знаков",
      pass: letter.length >= 350 && letter.length <= 1500,
      hint: `Сейчас ${letter.length}. Короткое выглядит отпиской, длинное не читают.`,
    },
    {
      check: "Есть приветствие",
      pass: /здравствуйте|добрый день|добрый вечер|привет/i.test(letter),
      hint: "Письмо без приветствия читается как рассылка.",
    },
    {
      check: "Упомянута компания",
      pass: company.length > 0 && lower.includes(company),
      hint: "Назови компанию — это главный маркер, что письмо не шаблон.",
    },
    {
      check: "Упомянута позиция",
      pass: titleWords.some((w) => lower.includes(w)),
      hint: "Сошлись на название вакансии из объявления.",
    },
    {
      check: "Персонализация под требования",
      pass: skills.length === 0 || matchedSkills.length >= 1,
      hint: `Используй ключевые навыки из вакансии (${skills.slice(0, 5).join(", ")}).`,
    },
    {
      check: "Без клише",
      pass: !CLICHES.some((c) => lower.includes(c)),
      hint: "«Стрессоустойчивый», «коммуникабельный» и т.п. — в корзину.",
    },
    {
      check: "Есть призыв к действию",
      pass: /созвон|обсудить|интервью|встреч|связаться|расскажу|готов ответить/i.test(letter),
      hint: "Закончи предложением следующего шага.",
    },
    {
      check: "Нет незаполненных плейсхолдеров",
      pass: !/\{[a-z_]+\}/i.test(letter),
      hint: "В письме остались {переменные} из шаблона.",
    },
  ];
}
