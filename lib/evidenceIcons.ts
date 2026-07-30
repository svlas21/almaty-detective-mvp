import {
  Apple,
  Baby,
  Battery,
  Bed,
  Briefcase,
  BookOpen,
  Cable,
  Camera,
  Car,
  ChefHat,
  Clock,
  Contact,
  Cpu,
  Crown,
  Disc,
  Dumbbell,
  FileText,
  Flame,
  Footprints,
  Gamepad2,
  Gem,
  Gift,
  Glasses,
  IdCard,
  Image,
  Key,
  Mail,
  MessageCircle,
  PanelTop,
  PenTool,
  Phone,
  Pill,
  Quote,
  Radio,
  Receipt,
  Shirt,
  Sparkles,
  SprayCan,
  Sprout,
  StickyNote,
  Tag,
  Trash2,
  Umbrella,
  UtensilsCrossed,
  Watch,
  Wine,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Единый источник истины для иконок улик (Дело №9704) — используется и
 * облаком осмотра (EvidenceSearch), и "Собранными уликами" (GameScreen),
 * чтобы одна и та же улика/категория всегда получала одну и ту же иконку.
 */

/** evidence.generic_category / case_decoy_categories.label -> иконка. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Реальные категории (evidence.generic_category по всем делам/локациям)
  "Бутылки": Wine,
  "Визитки и реклама": Contact,
  "Документы и справки": FileText,
  "Еда": Apple,
  "Книги и блокноты": BookOpen,
  "Мусор": Trash2,
  "Письма и записки": Mail,
  "Средства связи": Radio,
  "Транспорт": Car,
  "Удостоверения и документы": IdCard,
  "Фотографии и видеозаписи": Camera,
  "Чеки и квитанции": Receipt,

  // Обманки (case_decoy_categories)
  "Аудио- и видеокассеты": Disc,
  "Батарейки": Battery,
  "Бытовая химия": SprayCan,
  "Головные уборы": Crown,
  "Зарядные устройства и кабели": Cable,
  "Зеркала": PanelTop,
  "Зонты": Umbrella,
  "Игрушки": Baby,
  "Инструменты": Wrench,
  "Канцелярия": PenTool,
  "Ключи и брелоки": Key,
  "Комнатные растения": Sprout,
  "Косметика и парфюмерия": Sparkles,
  "Кухонная утварь": ChefHat,
  "Лекарства и аптечка": Pill,
  "Настенные часы": Clock,
  "Настольные игры": Gamepad2,
  "Обувь": Footprints,
  "Одежда": Shirt,
  "Очки": Glasses,
  "Пепельницы и зажигалки": Flame,
  "Постельное бельё": Bed,
  "Постеры и картины": Image,
  "Посуда": UtensilsCrossed,
  "Ремни и аксессуары": Watch,
  "Спортивный инвентарь": Dumbbell,
  "Сумки и рюкзаки": Briefcase,
  "Украшения": Gem,
  "Шкатулки и сувениры": Gift,
  "Электроника": Cpu,
};

/**
 * evidence.name -> иконка, для улик БЕЗ generic_category — те, что выдаются
 * допросом/предъявлением, а не осмотром локации (granted_by_character_id
 * или reaction-chain), и потому в облаке осмотра никогда не появляются.
 */
const NAME_ICONS: Record<string, LucideIcon> = {
  "Опрос соседки": MessageCircle,
  "Звонок Марата": Phone,
  "Записка от Игоря": StickyNote,
  "Показания Олжаса": Quote,
  "Автомобиль потерпевшего": Car,
};

/** Категория/имя без явного соответствия — не пустое место. */
const DEFAULT_EVIDENCE_ICON: LucideIcon = Tag;

/**
 * Единая точка выбора иконки для любой улики/варианта облака: сначала
 * generic_category (если есть) -> иконка по категории; если категории нет —
 * по name; если нигде нет совпадения — общий фолбэк. Облако осмотра зовёт
 * её с уже промаскированным label в обоих полях (там label и есть
 * категория — отдельной "настоящей" улики за decoy не стоит), "Собранные
 * улики" — с реальными name/generic_category конкретной улики.
 */
export function getEvidenceIcon(evidence: {
  name: string;
  generic_category?: string | null;
}): LucideIcon {
  if (evidence.generic_category) {
    return CATEGORY_ICONS[evidence.generic_category] ?? DEFAULT_EVIDENCE_ICON;
  }
  return NAME_ICONS[evidence.name] ?? DEFAULT_EVIDENCE_ICON;
}
