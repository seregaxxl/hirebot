"use client";

// Свой global-error нужен как обход бага пререндера /_global-error в Next 16
// (https://github.com/vercel/next.js/issues/87719)
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: "sans-serif", padding: 40 }}>
        <h2>Что-то пошло не так</h2>
        <button onClick={() => reset()}>Попробовать снова</button>
      </body>
    </html>
  );
}
