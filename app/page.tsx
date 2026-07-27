import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { CaseRecord } from "@/types/game";

// Каталог дел рендерится на сервере. is_published фильтрует черновики.
export default async function HomePage() {
  const db = supabaseAdmin();
  const { data: cases, error } = await db
    .from("cases")
    .select("*")
    .eq("is_published", true)
    .returns<CaseRecord[]>();

console.log("ОШИБКА БАЗЫ:", error);

  return (
    <div className="container">
      <h1>Детектив Алматы</h1>
      <p className="muted">
        Каталог дел. Пока пусто — добавьте первое дело в таблицу{" "}
        <code>cases</code> и поставьте <code>is_published = true</code>.
      </p>

      {(!cases || cases.length === 0) && (
        <div className="card">
          <p className="muted">Опубликованных дел пока нет.</p>
        </div>
      )}

      {cases?.map((c) => (
        <div className="card" key={c.id}>
          <h2>{c.title}</h2>
          <p className="muted">{c.intro_text}</p>
          <p>{c.price.toLocaleString("ru-RU")} ₸</p>
          <button className="btn">Купить доступ</button>
        </div>
      ))}
    </div>
  );
}
