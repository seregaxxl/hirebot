// Каталог площадок и чеклист трудоустройства. id стабильны — по ним хранится
// прогресс (отмеченные пункты) в Setting["plan_checked"].

export type Platform = { id: string; name: string; url: string; note: string };
export type PlatformGroup = { title: string; subtitle?: string; items: Platform[] };

export const PLATFORM_GROUPS: PlatformGroup[] = [
  {
    title: "EU / международка (remote)",
    subtitle: "Основной рынок. LinkedIn — база, остальное добивает охват.",
    items: [
      {
        id: "plat:linkedin",
        name: "LinkedIn",
        url: "https://www.linkedin.com/jobs/",
        note: "Основной канал — до 70% PM-вакансий здесь. После правки профиля начинает работать inbound: рекрутёры пишут сами. Включи «Open to work».",
      },
      {
        id: "plat:wellfound",
        name: "Wellfound (ex-AngelList)",
        url: "https://wellfound.com/",
        note: "Стартапы, много Technical PM. Профиль «PO, который сам кодит» здесь ценят выше, чем в корпорациях.",
      },
      {
        id: "plat:wttj",
        name: "Welcome to the Jungle (ex-Otta)",
        url: "https://www.welcometothejungle.com/",
        note: "Качественная EU-выборка вакансий, аккуратная фильтрация.",
      },
      {
        id: "plat:wwr",
        name: "We Work Remotely",
        url: "https://weworkremotely.com/",
        note: "Чисто remote.",
      },
      {
        id: "plat:remoteok",
        name: "RemoteOK",
        url: "https://remoteok.com/",
        note: "Чисто remote.",
      },
      {
        id: "plat:join",
        name: "Join.com",
        url: "https://join.com/",
        note: "Европейские стартапы и мидл-компании, много Германии/Австрии.",
      },
      {
        id: "plat:djinni",
        name: "Djinni",
        url: "https://djinni.co/",
        note: "Обязательно. Анонимный профиль, рекрутёры пишут сами с вилкой; много EU/US-компаний, нанимающих из Восточной Европы. Украинский диплом и локация Сербия — ок. В заголовке: «Product Owner / Technical PM».",
      },
    ],
  },
  {
    title: "Русскоязычный рынок",
    items: [
      {
        id: "plat:hh",
        name: "hh.ru",
        url: "https://hh.ru/",
        note: "Да, но для PM без сопроводительного отклик тонет — пиши письма (их генерит Hirebot).",
      },
      {
        id: "plat:habr",
        name: "Habr Career",
        url: "https://career.habr.com/",
        note: "Продуктовые роли в техкомпаниях — твой техбэкграунд здесь плюс.",
      },
      {
        id: "plat:getmatch",
        name: "getmatch",
        url: "https://getmatch.ru/",
        note: "Формат «рекрутёры пишут сами» с вилкой.",
      },
      {
        id: "plat:tg",
        name: "Telegram-каналы с вакансиями",
        url: "https://t.me/s/",
        note: "Подпишись на 3–4 крупных по запросу «product manager вакансии» — часто вилки и прямые контакты нанимающих.",
      },
    ],
  },
  {
    title: "Сербия (локально)",
    subtitle: "Рынок PM узкий, но сербский язык — твоё уникальное преимущество, выноси его в сопроводительное.",
    items: [
      {
        id: "plat:helloworld",
        name: "HelloWorld.rs",
        url: "https://www.helloworld.rs/",
        note: "Главный местный IT-борд.",
      },
      {
        id: "plat:infostud",
        name: "Poslovi Infostud",
        url: "https://poslovi.infostud.com/",
        note: "Крупнейший общий джоб-борд Сербии.",
      },
      {
        id: "plat:joberty",
        name: "Joberty",
        url: "https://www.joberty.com/",
        note: "IT-компании и отзывы; белградские аутсорс/продуктовые и релоцированные RU-компании ищут русскоговорящих PM с английским.",
      },
    ],
  },
];

export type ChecklistItem = { id: string; text: string; hint?: string };
export type ChecklistGroup = { title: string; items: ChecklistItem[] };

export const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    title: "Профиль и позиционирование",
    items: [
      {
        id: "chk:linkedin-profile",
        text: "Переписать LinkedIn: заголовок, About, «Open to work»",
        hint: "Заголовок с ролью + доменами. Это включает inbound от рекрутёров.",
      },
      {
        id: "chk:positioning",
        text: "Единое позиционирование «Product Owner / Technical PM» во всех профилях",
        hint: "Один заголовок на LinkedIn, Djinni, Wellfound — чтобы поиск находил.",
      },
      {
        id: "chk:resume-versions",
        text: "Завести 2–3 версии резюме под роли (PM / Product / CTO)",
        hint: "Делается в Настройках Hirebot — по ним работают скоринг и аналитика.",
      },
      {
        id: "chk:ats",
        text: "Прогнать резюме через ATS-скорер до 80+ (Jobscan / Rezi / Enhancv)",
      },
    ],
  },
  {
    title: "Завести профили на площадках",
    items: [
      { id: "chk:profiles-eu", text: "EU/remote: LinkedIn, Wellfound, Djinni (мин. эти три)" },
      { id: "chk:profiles-ru", text: "RU: hh.ru, Habr Career, getmatch + 3–4 telegram-канала" },
      { id: "chk:profiles-rs", text: "Сербия: HelloWorld.rs, Poslovi Infostud, Joberty" },
    ],
  },
  {
    title: "Ежедневная рутина",
    items: [
      {
        id: "chk:daily-apply",
        text: "5–10 целевых откликов в день с сопроводительным",
        hint: "Качество > количество: письмо под вакансию, а не рассылка.",
      },
      {
        id: "chk:log",
        text: "Каждый отклик заносить в журнал Hirebot",
        hint: "Без этого не будет аналитики воронки.",
      },
      {
        id: "chk:weekly-review",
        text: "Раз в неделю: аналитика воронки + совет коуча на дашборде",
      },
    ],
  },
  {
    title: "Прямой аутрич (самая высокая конверсия)",
    items: [
      {
        id: "chk:target-list",
        text: "Собрать список 20–30 компаний в своих доменах (devtools, финтех, engineering analytics)",
      },
      {
        id: "chk:outreach",
        text: "Писать напрямую founder / Head of Product — короткое письмо с одним релевантным кейсом",
        hint: "Ты умеешь продавать C-level — тот же скилл. На EU-стартапах «PM с руками» в дефиците, конверсия в разы выше отклика на вакансию.",
      },
      {
        id: "chk:outreach-template",
        text: "Сделать шаблон аутрич-письма под свои кейсы",
        hint: "Можно попросить Claude собрать его под твоё резюме.",
      },
    ],
  },
];
