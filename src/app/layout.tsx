import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hirebot — воронка найма",
  description: "Журнал поиска работы: поиск вакансий, письма и аналитика воронки с коучем на Claude",
};

const nav = [
  { href: "/", label: "Дашборд" },
  { href: "/vacancies", label: "Вакансии" },
  { href: "/letters", label: "Письма" },
  { href: "/plan", label: "План" },
  { href: "/outreach", label: "Аутрич" },
  { href: "/settings", label: "Настройки" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <span className="text-lg font-bold">🤖 Hirebot</span>
            <nav className="flex gap-4 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
