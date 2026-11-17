import RichText, { tp } from "@/components/RichText";

export type EvidenceKind = "thing" | "testimony" | "expertise" | "document";

/** Бланки по видам записей. Печатная часть бланка — шрифт с засечками,
 *  всё «вписанное» — машинописью (как в настоящих протоколах 90-х). */
const FORMS: Record<
  EvidenceKind,
  { title: string; subtitle?: string; field: string; caption: string; signers: string[]; stamp?: string }
> = {
  thing: {
    title: "ПРОТОКОЛ",
    subtitle: "осмотра места происшествия",
    field: "Осмотрено",
    caption: "(что осмотрено)",
    signers: ["Следователь", "Эксперт-криминалист"],
  },
  testimony: {
    title: "ПРОТОКОЛ",
    subtitle: "допроса",
    field: "Допрошен(а)",
    caption: "(фамилия, имя, отчество)",
    signers: ["Следователь", "Допрошенный"],
  },
  expertise: {
    title: "ЗАКЛЮЧЕНИЕ",
    subtitle: "эксперта",
    field: "Объект",
    caption: "(объект исследования)",
    signers: ["Эксперт"],
    stamp: "ЭКО ГУВД",
  },
  document: {
    title: "СПРАВКА",
    field: "По запросу",
    caption: "(о чём справка)",
    signers: ["Исполнитель"],
  },
};

interface Props {
  kind?: EvidenceKind | null;
  name: string;
  text: string | null | undefined;
  /** № листа дела (л.д.) */
  sheet?: number;
  /** Место — для протокола осмотра (название локации) */
  place?: string | null;
}

export default function EvidenceForm({ kind, name, text, sheet, place }: Props) {
  const k: EvidenceKind = kind ?? "thing";
  const base = FORMS[k];
  // Название записи «Виктор: по четвергам…» → «Виктор» идёт в поле бланка
  const prefix = name.includes(":") ? name.split(":")[0].trim() : name;
  let f = base;
  let fieldValue = k === "thing" ? place || name : prefix;
  if (k === "testimony") {
    if (/^Очная ставка/i.test(prefix)) {
      f = { ...base, subtitle: "очной ставки", field: "По делу", caption: "(предмет очной ставки)" };
      fieldValue = name.includes(":") ? name.split(":").slice(1).join(":").trim() : name;
    } else if (/^(Признание|Показания)\s+/i.test(prefix)) {
      // «Признание Валентины» → «Со слов: Валентины»
      f = { ...base, field: "Со слов", caption: "(чьих)" };
      fieldValue = prefix.replace(/^(Признание|Показания)\s+/i, "");
    }
  }
  if (k === "document") {
    const first = prefix.split(/\s+/)[0].toLowerCase();
    const titles: Record<string, string> = { протокол: "ПРОТОКОЛ", санкция: "САНКЦИЯ", справка: "СПРАВКА", тело: "АКТ" };
    f = { ...base, title: titles[first] ?? base.title };
  }

  return (
    <article className={`ev-form is-${k}`}>
      <header className="ev-form-top">
        <span>ГУВД г. Алматы · дело № 9704</span>
        <span>
          л.д. <u>{sheet ?? "  "}</u>
        </span>
      </header>

      <h4 className="ev-form-title">
        {f.title}
        {f.subtitle && <small>{f.subtitle}</small>}
      </h4>

      <div className="ev-form-row">
        <span className="ev-form-fill">г. Алматы</span>
        <span className="ev-form-date">
          «<span className="ev-form-fill">25</span>» <span className="ev-form-fill">ноября</span> 19
          <span className="ev-form-fill">96</span> г.
        </span>
      </div>

      <div className="ev-form-field">
        <span className="ev-form-label">{f.field}</span>
        <span className="ev-form-line">
          <span className="ev-form-fill">{tp(fieldValue)}</span>
          <em>{f.caption}</em>
        </span>
      </div>

      <RichText text={text} className="typed ev-form-body" />

      <footer className="ev-form-signs">
        {f.signers.map((s) => (
          <div key={s} className="ev-form-sign">
            <span>{s}</span>
            <span className="ev-form-sign-line">
              <em>(подпись)</em>
            </span>
          </div>
        ))}
      </footer>
      {f.stamp && <span className="ev-form-stamp">{f.stamp}</span>}
    </article>
  );
}
