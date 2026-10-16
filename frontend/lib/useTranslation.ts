import { useLocale } from "@/lib/locale-context";
import { translations } from "@/lib/i18n";

type TranslationSection = (typeof translations)[keyof typeof translations];
type TranslationLeaf = { fr: string; en: string };

function isLeaf(node: unknown): node is TranslationLeaf {
  return Boolean(
    node &&
      typeof node === "object" &&
      "fr" in node &&
      "en" in node &&
      typeof (node as TranslationLeaf).fr === "string" &&
      typeof (node as TranslationLeaf).en === "string",
  );
}

export function useTranslation() {
  const { locale } = useLocale();

  function t(section: keyof typeof translations, key: string): string {
    const sectionNode = translations[section] as TranslationSection;
    const node = sectionNode[key as keyof typeof sectionNode];

    if (!node || !isLeaf(node)) {
      return key;
    }

    return node[locale];
  }

  return { t, locale };
}
