"use client";

import RichText, { tp } from "@/components/RichText";
import { useState } from "react";

export interface PendingCall {
  id: string;
  callerName: string;
  callerRole: string | null;
  dialogueText: string;
  /** "mobile" — трубка (по умолчанию); "scene" — сцена в ГУВД: записка, коридор, внутренний телефон. */
  style?: string;
}

interface PhoneCallOverlayProps {
  call: PendingCall;
  /** Фиксирует звонок как отвеченный на сервере (viewed_calls + последствия). */
  onAnswer: () => void | Promise<void>;
  /** Закрывает оверлей и обновляет state экрана (после "Положить трубку"). */
  onClose: () => void;
}

/**
 * Полноэкранный оверлей входящего звонка — трубка в стиле 90-х (силуэт как
 * у Nokia 2110i), пассивный: игрок жмёт "Ответить", слушает реплику
 * звонящего и кладёт трубку. Клавиатура и вторая софт-клавиша декоративные.
 */
export default function PhoneCallOverlay({ call, onAnswer, onClose }: PhoneCallOverlayProps) {
  const [phase, setPhase] = useState<"ringing" | "talking">("ringing");

  if (call.style === "scene") return <SceneOverlay call={call} onAnswer={onAnswer} onClose={onClose} />;

  function handleAnswer() {
    setPhase("talking");
    void onAnswer();
  }

  return (
    <div className="phone-call-overlay">
      <div className="phone-call-device">
        <div className="phone-call-antenna" />

        <div className="phone-call-screen">
          <div className="phone-call-status-row">
            <div className="phone-call-meter signal">
              <div className="phone-call-meter-bars">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="phone-call-icon-antenna" />
            </div>
            <div className="phone-call-meter battery">
              <div className="phone-call-meter-bars">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="phone-call-icon-battery" />
            </div>
          </div>

          {phase === "ringing" ? (
            <>
              <div className="phone-call-title">
                ВХОДЯЩИЙ
                <br />
                ВЫЗОВ
              </div>
              <div className="phone-call-caller-name">{call.callerName}</div>
              {call.callerRole && <div className="phone-call-caller-role">{tp(call.callerRole)}</div>}
              <div className="phone-call-softkeys">
                <span>Ответ</span>
                <span>Меню</span>
              </div>
            </>
          ) : (
            <>
              <div className="phone-call-caller-name" style={{ marginBottom: 10 }}>
                {call.callerName}
              </div>
              <RichText text={call.dialogueText} className="phone-call-dialogue" />
              <div className="phone-call-softkeys">
                <span>Сброс</span>
                <span>Меню</span>
              </div>
            </>
          )}
        </div>

        {phase === "ringing" ? (
          <button className="phone-call-answer-btn" onClick={handleAnswer}>
            Ответить
          </button>
        ) : (
          <button className="phone-call-answer-btn phone-call-hangup-btn" onClick={onClose}>
            Положить трубку
          </button>
        )}

        <div className="phone-call-keypad-hint" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Сцена начальства (supabase/039): записка на столе, разговор в коридоре,
 * звонок по внутреннему — лист из дела, без мобильного телефона (1996 год).
 * callerRole — подпись сцены («Записка на столе»), callerName — кто.
 */
function SceneOverlay({ call, onAnswer, onClose }: PhoneCallOverlayProps) {
  const [closing, setClosing] = useState(false);

  async function handleClose() {
    if (closing) return;
    setClosing(true);
    await onAnswer();
    await onClose();
  }

  return (
    <div className="phone-call-overlay">
      <div className="scene-call-sheet" role="dialog" aria-label={call.callerRole ?? call.callerName}>
        {call.callerRole && <div className="scene-call-place">{tp(call.callerRole)}</div>}
        <div className="scene-call-who">{tp(call.callerName)}</div>
        <RichText text={call.dialogueText} className="scene-call-text" />
        <button className="scene-call-btn" onClick={handleClose} disabled={closing}>
          Понятно
        </button>
      </div>
    </div>
  );
}
