@AGENTS.md

# Hirebot

Локальный **журнал поиска работы** (PM / Product / CTO): поиск и скоринг вакансий на hh.ru, генерация сопроводительных писем, ручной учёт откликов, аналитика воронки и коуч-советы от Claude. Всё хранится локально в SQLite.

> ⚠️ **API соискателей hh закрыт 15 декабря 2025.** Автоотклики, OAuth-вход соискателя и синхронизация статусов через `/negotiations` удалены. Осталось: поиск вакансий (авторизуется **токеном приложения**), письма и ручной журнал воронки. Откликаешься на hh.ru руками, отклик заносишь в журнал → копится аналитика.

> Личный план трудоустройства (резюме под ATS, hh, LinkedIn, фото, ежедневная рутина откликов, подготовка к собесам) — в [`ROADMAP.md`](ROADMAP.md).

## Стек

Next.js 16 (App Router, Turbopack) · TypeScript · Prisma 6 + SQLite · Tailwind CSS v4.
Письма и советы коуча генерирует **терминальный Claude Code** (`claude -p`) по подписке — API-ключа нет и не нужно.
Поиск вакансий авторизуется **токеном приложения hh** (`grant_type=client_credentials`) — нужны только Client ID/Secret, **ngrok не нужен**.

## Запуск с нуля на новом устройстве

Предполагается, что проект уже скопирован/склонирован в папку. `.env` и `prisma/dev.db` в git не попадают (`.gitignore`) — их создаём заново.

1. **Node.js 20+** (разрабатывалось на Node 24, npm 11). Проверь: `node -v`.

2. **Зависимости:**
   ```bash
   npm install
   ```

3. **Claude Code CLI** — нужен для писем и коуч-советов. Должна работать команда `claude` в терминале и быть выполнен вход по подписке (`claude` → авторизация). Проверка: `echo "привет" | claude -p --output-format text`.
   Если CLI недоступен, письма молча падают на шаблон, а кнопка коуча вернёт понятную ошибку.

4. **База данных** (создаёт файл `prisma/dev.db`):
   ```bash
   npx prisma db push
   ```

5. **Приложение hh.ru:** на [dev.hh.ru/admin](https://dev.hh.ru/admin) создай приложение, скопируй Client ID / Secret. Redirect URI указывать не обязательно — поиск работает по токену приложения, callback не используется.

6. **Файл `.env`** в корне проекта:
   ```
   DATABASE_URL="file:./dev.db"
   HH_CLIENT_ID="<из dev.hh.ru>"
   HH_CLIENT_SECRET="<из dev.hh.ru>"
   HH_USER_AGENT="hirebot/1.0 (твой@email)"
   ```

7. **Запуск:**
   ```bash
   npm run dev            # http://localhost:3000
   ```
   Меняешь `.env` → перезапусти `npm run dev`.

8. В приложении: **Настройки → Версии резюме** — заведи резюме под роли (PM / Product / CTO), по ним работают скоринг и аналитика.

## ⚠️ Windows: регистр пути

Папка на диске — `C:\Users\<user>\WebstormProjects\hirebot` (заглавные W, P). Запускай `npm run build` / `npm run dev` **из пути с правильным регистром**. Если запустить из пути в нижнем регистре (`webstormprojects`), Turbopack/webpack считают модули задублированными и сборка падает с `Invariant: Expected workStore to be initialized` на `/_global-error` или `/_not-found`. На mac/linux проблемы нет.

## Как это работает

- **Поиск вакансий** (`/api/vacancies/search`) → hh API (авторизация токеном приложения, `src/lib/hh.ts`) → скоринг (`src/lib/scoring.ts`, 0–100 по роли/зарплате/свежести) → сохранение в базу.
- **hh-клиент** (`src/lib/hh.ts`) — только публичные методы: `searchVacancies`, `getVacancy`. Токен приложения (`client_credentials`) кешируется в памяти и обновляется при 401/403. OAuth соискателя, отклики и negotiations удалены.
- **Списки вакансий** (`/api/vacancies?mode=`): `new` (в очереди — `NEW`/`MANUAL_REQUIRED`), `applied` (`APPLIED`).
- **Письма** (`src/lib/letters.ts`) — `generateLetterLLM` вызывает `claude -p` через общий `runClaude` (`src/lib/claude.ts`: промпт по stdin, `shell:true` для .cmd-шима на Windows). `checkLetter` — чеклист качества. `DEFAULT_TEMPLATE` и шаблоны из БД — fallback.
- **Отклик = ручной.** На вкладке «Вакансии» генерируешь письмо → копируешь → откликаешься на hh по ссылке → «Занести в журнал» (`/api/vacancies/[id]/mark-applied`) создаёт `Application`. Стадии воронки (SENT → VIEWED → INVITED → скрининг → собес → оффер/отказ) двигаешь вручную на дашборде.
- **Аналитика** (`src/lib/analytics.ts`) — `computeStats` считает воронку, конверсии по роли/резюме/типу письма, зависшие отклики. Используется дашбордом и коучем.
- **Коуч** (`src/lib/coach.ts`, `/api/coach`) — собирает сводку воронки в промпт, `claude -p` даёт разбор «что улучшить + план на день». Последний совет кешируется в таблице `Setting` (`coach_advice`).
- **План** (`/plan`, `src/lib/plan.ts`) — каталог площадок (EU/RU/Сербия) и чеклист действий с чекбоксами; прогресс хранится в `Setting["plan_checked"]` (JSON-массив id).
- **Аутрич-CRM** (`/outreach`, `src/lib/outreach.ts`) — прямые письма основателям как воронка: компания/контакт/этап (PROSPECT→…→WON/LOST), заметки. `/api/outreach/[id]/letter` генерит холодное письмо через `claude -p` (EN/RU) под кейсы кандидата из `Setting["outreach_profile"]`. Общий вызов Claude — `runClaude` (`src/lib/claude.ts`).
- **Данные:** Prisma-модели в `prisma/schema.prisma` (Vacancy, Application, ResumeVersion, StatusEvent, CoverLetterTemplate, BlacklistedEmployer, Outreach, Setting). Версии резюме заводятся вручную (id = `randomUUID`).

## Команды

```bash
npm run dev              # dev-сервер (Turbopack)
npm run build            # прод-сборка (проверка типов + prerender)
npx prisma db push       # применить схему к БД
npx prisma studio        # GUI для просмотра базы
```

После правок `prisma/schema.prisma` → `npx prisma db push` (перегенерит клиент).

## Ограничения hh API

- **API соискателей закрыт (15.12.2025):** нельзя откликаться, синхронизировать статусы и тянуть свои резюме через API — только вручную на hh.ru.
- Поиск вакансий (`/vacancies`) больше не анонимный — требует токен приложения (`client_credentials`). Достаточно Client ID/Secret, ngrok/redirect не нужны.
- Токен приложения кешируется в памяти процесса (не в БД) и перезапрашивается при истечении/403.
