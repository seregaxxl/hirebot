@AGENTS.md

# Hirebot

Локальный инструмент поиска работы (PM / Product / CTO) через hh.ru: скоринг вакансий, массовые автоотклики, сопроводительные письма и аналитика воронки. Всё хранится локально в SQLite.

> Личный план трудоустройства (резюме под ATS, hh, LinkedIn, фото, ежедневная рутина 200 откликов, подготовка к собесам) — в [`ROADMAP.md`](ROADMAP.md).

## Стек

Next.js 16 (App Router, Turbopack) · TypeScript · Prisma 6 + SQLite · Tailwind CSS v4.
Письма генерирует **терминальный Claude Code** (`claude -p`) по подписке — API-ключа нет и не нужно.
OAuth-callback от hh.ru принимается через **ngrok** (hh не разрешает `localhost` в Redirect URI).

## Запуск с нуля на новом устройстве

Предполагается, что проект уже скопирован/склонирован в папку. `.env` и `prisma/dev.db` в git не попадают (`.gitignore`) — их создаём заново.

1. **Node.js 20+** (разрабатывалось на Node 24, npm 11). Проверь: `node -v`.

2. **Зависимости:**
   ```bash
   npm install
   ```

3. **Claude Code CLI** — нужен для генерации писем. Должна работать команда `claude` в терминале и быть выполнен вход по подписке (`claude` → авторизация). Проверка: `echo "привет" | claude -p --output-format text`.
   Если CLI недоступен, бот молча использует шаблонные письма.

4. **ngrok** — для OAuth hh.ru:
   ```bash
   winget install ngrok.ngrok        # Windows; на mac/linux — brew/пакет с ngrok.com
   ngrok config add-authtoken <твой_токен>   # токен с ngrok.com (бесплатный аккаунт)
   ```

5. **База данных** (создаёт файл `prisma/dev.db`):
   ```bash
   npx prisma db push
   ```

6. **Файл `.env`** в корне проекта (см. `.env.example`). ngrok-адрес узнаешь на шаге 8, но `.env` можно заполнить и потом:
   ```
   DATABASE_URL="file:./dev.db"
   HH_CLIENT_ID="<из dev.hh.ru>"
   HH_CLIENT_SECRET="<из dev.hh.ru>"
   HH_REDIRECT_URI="https://xxxx.ngrok-free.app/api/auth/hh/callback"
   HH_USER_AGENT="hirebot/1.0 (твой@email)"
   ```

7. **Приложение hh.ru:** на [dev.hh.ru/admin](https://dev.hh.ru/admin) создай приложение, Redirect URI = точный ngrok-адрес из `HH_REDIRECT_URI` (шаг 8). Скопируй Client ID / Secret в `.env`.

8. **Запуск** (два терминала):
   ```bash
   ngrok http 3000        # терминал 1 — копируй https://xxxx.ngrok-free.app в HH_REDIRECT_URI и в приложение hh
   npm run dev            # терминал 2 — http://localhost:3000
   ```
   Меняешь `.env` → перезапусти `npm run dev`.

9. В приложении: **Настройки → Подключить hh.ru → Синхронизировать резюме**, каждому резюме назначь роль (PM / Product / CTO).

## ⚠️ Windows: регистр пути

Папка на диске — `C:\Users\<user>\WebstormProjects\hirebot` (заглавные W, P). Запускай `npm run build` / `npm run dev` **из пути с правильным регистром**. Если запустить из пути в нижнем регистре (`webstormprojects`), Turbopack/webpack считают модули задублированными и сборка падает с `Invariant: Expected workStore to be initialized` на `/_global-error` или `/_not-found`. На mac/linux проблемы нет.

## Как это работает

- **Поиск вакансий** (`/api/vacancies/search`) → hh API → скоринг (`src/lib/scoring.ts`, 0–100 по роли/зарплате/свежести) → сохранение в базу.
- **Списки вакансий** (`/api/vacancies?mode=`): `auto` (без теста, доступны для API-отклика), `manual` (`hasTest` — только ручной отклик на hh), `applied`.
- **Массовый автоотклик** (`src/lib/autoapply.ts`) — фоновый воркер с глобальным состоянием (переживает hot-reload), статус опрашивается через `GET /api/autoapply`. Шлёт отклики по скорингу ≥ порога до дневного лимита hh (200/сутки), вакансии с тестом уводит в `MANUAL_REQUIRED`.
- **Письма** (`src/lib/letters.ts`) — `generateLetterLLM` вызывает `claude -p` через `child_process.spawn` (промпт по stdin, `shell:true` для .cmd-шима на Windows). `checkLetter` — чеклист качества. `DEFAULT_TEMPLATE` и шаблоны из БД — fallback.
- **Синхронизация статусов** (`/api/sync`) — тянет negotiations с hh (просмотрен / приглашение / отказ). Ручные стадии воронки (скрининг → собес → оффер) двигаются на дашборде и синком не перетираются.
- **Данные:** Prisma-модели в `prisma/schema.prisma` (Vacancy, Application, ResumeVersion, StatusEvent, CoverLetterTemplate, BlacklistedEmployer, Setting). hh-токены хранятся в таблице `Setting`.

## Команды

```bash
npm run dev              # dev-сервер (Turbopack)
npm run build            # прод-сборка (проверка типов + prerender)
npx prisma db push       # применить схему к БД
npx prisma studio        # GUI для просмотра базы
```

После правок `prisma/schema.prisma` → `npx prisma db push` (перегенерит клиент).

## Ограничения hh API

- 200 откликов/сутки на аккаунт.
- Вакансии с обязательным тестом/опросником — только ручной отклик (вкладка «Только вручную»).
- ngrok нужен только в момент OAuth-callback; после подключения работаешь на localhost.
