import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/payments/webhook
 *
 * ЗАГЛУШКА — конкретный формат payload зависит от выбранного эквайринга/Kaspi Pay,
 * уточните в их документации перед реализацией. Общая логика не меняется:
 * 1) проверить подпись/секрет запроса (сравнить с PAYMENT_WEBHOOK_SECRET),
 * 2) найти purchase по payment_provider_ref,
 * 3) пометить его paid, только после этого можно вызывать /api/games/create.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.PAYMENT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Неверная подпись webhook" }, { status: 401 });
  }

  const payload = await req.json();
  // TODO: замените на реальные поля из документации вашего платёжного провайдера
  const { purchaseId, providerTransactionId, status } = payload;

  if (status !== "success") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("purchases")
    .update({
      status: "paid",
      payment_provider_ref: providerTransactionId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", purchaseId);

  if (error) {
    return NextResponse.json({ error: "Не удалось обновить статус оплаты" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
