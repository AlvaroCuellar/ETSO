<script lang="ts">
 import { onMount } from 'svelte';
 import { page } from '$app/state';
 import Languages from 'lucide-svelte/icons/languages';
 import { getLocaleTextDirection, localizePath, type Locale } from '$lib/i18n';
 import { LANGUAGE_PREFERENCE_EVENT, LANGUAGE_PREFERENCE_KEY, readPreferredLocale, rememberLocale } from '$lib/utils/language-preference';

 let { locale }: {locale: Locale} = $props();
 let preferred = $state<Locale | null>(null);
 const copy = {
  es: { question:'¿Prefieres consultar esta página en español?', change:'Cambiar a español', keep:'Mantener el idioma actual' },
  en: { question:'Would you prefer to read this page in English?', change:'Switch to English', keep:'Keep the current language' },
  fr: { question:'Préférez-vous consulter cette page en français ?', change:'Passer en français', keep:'Garder la langue actuelle' },
  pt: { question:'Prefere consultar esta página em português?', change:'Mudar para português', keep:'Manter o idioma atual' },
  it: { question:'Preferisci consultare questa pagina in italiano?', change:'Passa all’italiano', keep:'Mantieni la lingua attuale' },
  de: { question:'Möchten Sie diese Seite lieber auf Deutsch lesen?', change:'Zu Deutsch wechseln', keep:'Aktuelle Sprache beibehalten' },
  zh: { question:'您希望以中文浏览此页面吗？', change:'切换到中文', keep:'保留当前语言' },
  ja: { question:'このページを日本語で読みますか？', change:'日本語に切り替える', keep:'現在の言語を使う' },
  ko: { question:'이 페이지를 한국어로 보시겠습니까?', change:'한국어로 전환', keep:'현재 언어 유지' },
  ru: { question:'Хотите читать эту страницу на русском языке?', change:'Перейти на русский', keep:'Сохранить текущий язык' },
  ar: { question:'هل تفضّل قراءة هذه الصفحة باللغة العربية؟', change:'التبديل إلى العربية', keep:'الإبقاء على اللغة الحالية' }
 };
 const target = $derived(preferred ? localizePath(`${page.url.pathname}${page.url.search}${page.url.hash}`, preferred) : '');

 onMount(() => {
  const refresh = () => { preferred = readPreferredLocale(); };
  // A manual choice starts navigation: never suggest it on the page being left.
  const chosen = () => { preferred = null; };
  const stored = (event: StorageEvent) => {
   if (event.key === LANGUAGE_PREFERENCE_KEY || event.key === null) refresh();
  };
  refresh();
  window.addEventListener(LANGUAGE_PREFERENCE_EVENT, chosen);
  window.addEventListener('storage', stored);
  return () => {
   window.removeEventListener(LANGUAGE_PREFERENCE_EVENT, chosen);
   window.removeEventListener('storage', stored);
  };
 });
</script>

{#if preferred && preferred !== locale}
 <aside data-language-suggestion data-i18n-skip lang={preferred} dir={getLocaleTextDirection(preferred)} aria-label={copy[preferred].question} class="border-b border-border-accent-blue bg-surface-accent-blue/60 font-ui">
  <div class="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-5 lg:px-8">
   <p class="m-0 flex min-w-0 flex-1 items-center gap-2 text-[0.87rem] leading-relaxed text-brand-blue-dark"><Languages class="h-4 w-4 shrink-0" aria-hidden="true" />{copy[preferred].question}</p>
   <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8rem]">
    <a href={target} data-i18n-preserve-locale data-sveltekit-preload-data="off" onclick={()=>{if(preferred)rememberLocale(preferred);}} class="rounded-md bg-brand-blue px-3 py-2 font-semibold text-white no-underline transition hover:bg-brand-blue-dark hover:text-white hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue">{copy[preferred].change}</a>
    <button type="button" class="rounded-md bg-transparent py-2 text-text-soft underline-offset-4 hover:text-brand-blue-dark hover:underline focus-visible:outline-2 focus-visible:outline-brand-blue" onclick={()=>rememberLocale(locale)}>{copy[preferred].keep}</button>
   </div>
  </div>
 </aside>
{/if}
