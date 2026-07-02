import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="text-2xl font-bold">Страница не найдена</h2>
      <Link href="/" className="text-blue-600 hover:underline">
        На дашборд
      </Link>
    </div>
  );
}
