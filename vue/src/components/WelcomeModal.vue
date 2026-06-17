<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';

const { lang } = useI18n();

const DISMISS_KEY = 'pelican-welcome-dismissed-at';
const SUPPRESS_MS = 30 * 60 * 1000;

const open = ref(false);
const videoSrc = ref('');

const YT: Record<'en' | 'ru' | 'es', string> = {
  ru: 'https://www.youtube-nocookie.com/embed/nVI14i504ek?rel=0&modestbranding=1&playsinline=1',
  en: 'https://www.youtube-nocookie.com/embed/pirGY80mHxs?rel=0&modestbranding=1&playsinline=1',
  es: 'https://www.youtube-nocookie.com/embed/pirGY80mHxs?rel=0&modestbranding=1&playsinline=1',
};

interface Step { t: string; d: string }
interface WelcomeText {
  title: string; desc: string; howItWorks: string;
  steps: Step[]; bonus: Step; cta: string; tagline: string; close: string; sub: string;
}

const TEXT: Record<'en' | 'ru' | 'es', WelcomeText> = {
  en: {
    title: 'Start earning more by copying the trades of professionals on Libertex',
    desc: 'Why learn from your own mistakes when you can adopt the experience of the best? Connect to successful traders, copy their strategies, and earn on the financial markets — <b>suitable even for those with no trading experience</b>. Smart trading and fast growth!',
    howItWorks: 'How it works',
    steps: [
      { t: 'Download the app', d: 'Available for iOS and Android' },
      { t: 'Quick registration', d: 'Use the e-mail from your Libertex account' },
      { t: 'Link your MetaTrader account', d: 'Copy the credentials from the «More» section in the Libertex app and paste them into the «Account» section in the Copy&nbsp;Trading app' },
      { t: 'Choose a top trader', d: 'Browse profiles and pick one whose strategy fits you' },
      { t: 'Automatic copying', d: "The system replicates the chosen trader's deals in real time" },
    ],
    bonus: { t: 'Track the result', d: 'Monitor profitability, change settings or pause at any time' },
    cta: 'Start now',
    tagline: "Let the experts' experience work for you!",
    close: 'Close',
    sub: 'Copy Trading',
  },
  ru: {
    title: 'Начните зарабатывать больше, копируя сделки профессионалов в Libertex',
    desc: 'Зачем учиться на своих ошибках, если можно перенимать опыт лучших? Подключайтесь к успешным трейдерам, копируйте их стратегии и зарабатывайте на финансовых рынках — <b>подходит даже тем, у кого нет опыта в торговле</b>. Разумный трейдинг и быстрый рост!',
    howItWorks: 'Как это работает',
    steps: [
      { t: 'Скачайте приложение', d: 'Доступно для iOS и Android' },
      { t: 'Быстрая регистрация', d: 'Используйте e-mail от вашего аккаунта Libertex' },
      { t: 'Привяжите счёт MetaTrader', d: 'Скопируйте данные из раздела «Ещё» в приложении Libertex и вставьте их в раздел «Счёт» в приложении Copy&nbsp;Trading' },
      { t: 'Выберите топ-трейдера', d: 'Изучите профили и выберите того, чья стратегия вам подходит' },
      { t: 'Автоматическое копирование', d: 'Система повторяет сделки выбранного трейдера в реальном времени' },
    ],
    bonus: { t: 'Следите за результатом', d: 'Отслеживайте доходность, меняйте настройки или ставьте на паузу в любой момент' },
    cta: 'Начать сейчас',
    tagline: 'Пусть опыт экспертов работает на вас!',
    close: 'Закрыть',
    sub: 'Copy Trading',
  },
  es: {
    title: 'Empieza a ganar más copiando las operaciones de profesionales en Libertex',
    desc: '¿Para qué aprender de tus propios errores si puedes aprovechar la experiencia de los mejores? Conéctate con traders exitosos, copia sus estrategias y gana en los mercados financieros — <b>apto incluso para quienes no tienen experiencia en trading</b>. ¡Trading inteligente y crecimiento rápido!',
    howItWorks: 'Cómo funciona',
    steps: [
      { t: 'Descarga la app', d: 'Disponible para iOS y Android' },
      { t: 'Registro rápido', d: 'Usa el e-mail de tu cuenta de Libertex' },
      { t: 'Vincula tu cuenta de MetaTrader', d: 'Copia los datos de la sección «Más» en la app de Libertex y pégalos en la sección «Cuenta» de la app de Copy&nbsp;Trading' },
      { t: 'Elige un top trader', d: 'Explora los perfiles y elige uno cuya estrategia se ajuste a ti' },
      { t: 'Copiado automático', d: 'El sistema replica las operaciones del trader elegido en tiempo real' },
    ],
    bonus: { t: 'Sigue el resultado', d: 'Monitorea la rentabilidad, cambia ajustes o pausa cuando quieras' },
    cta: 'Empezar ahora',
    tagline: '¡Deja que la experiencia de los expertos trabaje para ti!',
    close: 'Cerrar',
    sub: 'Copy Trading',
  },
};

const tx = computed<WelcomeText>(() => TEXT[lang.value] ?? TEXT.en);

function lockScroll(on: boolean) {
  try { document.body.style.overflow = on ? 'hidden' : ''; } catch { /* ignore */ }
}

function openModal() {
  videoSrc.value = YT[lang.value] ?? YT.en;
  open.value = true;
  lockScroll(true);
}

function dismiss() {
  open.value = false;
  videoSrc.value = '';
  lockScroll(false);
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
}

onMounted(() => {
  let last = 0;
  try { last = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10); } catch { /* ignore */ }
  if (Date.now() - last >= SUPPRESS_MS) openModal();
});

// keep the video language in sync if the user switches language while open
watch(lang, (l) => {
  if (open.value) videoSrc.value = YT[l] ?? YT.en;
});
</script>

<template>
  <div v-if="open" class="welcome-modal" role="dialog" aria-modal="true">
    <div class="welcome-backdrop" @click="dismiss"></div>
    <div class="welcome-panel">
      <button class="welcome-close" type="button" :aria-label="tx.close" @click="dismiss">×</button>

      <div class="welcome-brand">
        <span class="welcome-logo-tile" aria-hidden="true"><img :src="'/logo.png'" alt="" /></span>
        <span class="welcome-brand-text">
          <span class="welcome-brand-name"><span>LIBERTEX</span><span>SOCIAL</span></span>
          <span class="welcome-brand-sub">{{ tx.sub }}</span>
        </span>
      </div>

      <div class="welcome-video-wrap">
        <iframe
          :src="videoSrc"
          title="Libertex Copy Trading"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>

      <h1 class="welcome-title">{{ tx.title }}</h1>
      <p class="welcome-desc" v-html="tx.desc"></p>

      <div class="welcome-section-label">{{ tx.howItWorks }}</div>
      <ol class="welcome-steps">
        <li v-for="(s, i) in tx.steps" :key="i" class="welcome-step">
          <span class="welcome-step-num">{{ i + 1 }}</span>
          <div>
            <div class="welcome-step-title">{{ s.t }}</div>
            <div class="welcome-step-desc" v-html="s.d"></div>
          </div>
        </li>
      </ol>

      <div class="welcome-bonus">
        <span class="welcome-bonus-icon" aria-hidden="true">📊</span>
        <div>
          <div class="welcome-step-title">{{ tx.bonus.t }}</div>
          <div class="welcome-step-desc">{{ tx.bonus.d }}</div>
        </div>
      </div>

      <button class="welcome-cta" type="button" @click="dismiss">
        <span>{{ tx.cta }}</span><span aria-hidden="true">↗</span>
      </button>
      <p class="welcome-tag">{{ tx.tagline }}</p>
    </div>
  </div>
</template>

<style scoped>
.welcome-modal {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 32px 20px;
  overflow-y: auto;
  font-family: 'Manrope', Roboto, -apple-system, sans-serif;
}
.welcome-backdrop {
  position: fixed; inset: 0; z-index: 0;
  background: rgba(8, 10, 14, .78);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
          backdrop-filter: blur(8px) saturate(140%);
}
.welcome-panel {
  position: relative; z-index: 1;
  width: 100%; max-width: 720px;
  background: linear-gradient(180deg, rgba(28, 32, 38, .96), rgba(20, 23, 28, .96));
  border: 1px solid rgba(255, 255, 255, .10);
  border-radius: 18px;
  padding: 40px 44px 32px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .55), inset 0 1px 0 rgba(255, 255, 255, .12);
  color: #ecedef;
  animation: welcome-pop .35s cubic-bezier(.2, .8, .2, 1);
}
.welcome-video-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin: 4px 0 24px;
  border-radius: 14px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(255, 255, 255, .10);
  box-shadow:
    0 14px 36px rgba(0, 0, 0, .55),
    0 0 0 1px rgba(255, 102, 51, .18),
    inset 0 0 0 1px rgba(255, 255, 255, .04);
}
.welcome-video-wrap::before {
  content: ''; position: absolute; inset: -1px; pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255, 125, 69, .10), transparent 35%, transparent 65%, rgba(255, 102, 51, .12));
  mix-blend-mode: screen;
}
.welcome-video-wrap iframe {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  border: 0; display: block;
  background: #000;
}
@keyframes welcome-pop {
  from { opacity: 0; transform: translateY(12px) scale(.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
.welcome-close {
  position: absolute; top: 14px; right: 14px;
  width: 36px; height: 36px;
  border: 1.5px solid rgba(255, 255, 255, .14);
  border-radius: 50%;
  background: rgba(255, 255, 255, .04);
  color: rgba(255, 255, 255, .75);
  font-size: 22px; line-height: 1; font-family: inherit; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background .2s, border-color .2s, color .2s, transform .2s;
}
.welcome-close:hover { background: rgba(255, 255, 255, .10); border-color: rgba(255, 255, 255, .30); color: #fff; transform: rotate(90deg); }
.welcome-brand { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.welcome-logo-tile {
  width: 56px; height: 56px; flex: none;
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 4px 14px rgba(255, 102, 51, .35);
}
.welcome-logo-tile img { width: 100%; height: 100%; display: block; object-fit: cover; }
.welcome-brand-text { display: flex; flex-direction: column; gap: 3px; }
.welcome-brand-name {
  display: flex; flex-direction: column;
  font-weight: 800; font-size: 22px; line-height: 22px;
  letter-spacing: 0; text-transform: uppercase; color: #fff;
}
.welcome-brand-name span { display: block; }
.welcome-brand-sub {
  font-weight: 600; font-size: 14px; line-height: 15px;
  letter-spacing: 0.02em; color: rgba(255, 255, 255, .65);
}
.welcome-title {
  margin: 0 0 14px;
  font-weight: 800; font-size: 26px; line-height: 1.20;
  letter-spacing: -0.005em; color: #fff;
}
.welcome-desc {
  margin: 0 0 26px;
  font-size: 14.5px; line-height: 1.55; color: rgba(255, 255, 255, .80);
}
.welcome-desc :deep(b) { color: #fff; font-weight: 700; }
.welcome-section-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.10em; color: var(--accent);
  margin: 0 0 14px;
  display: flex; align-items: center; gap: 10px;
}
.welcome-section-label::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, rgba(255, 102, 51, .35), rgba(255, 255, 255, 0));
}
.welcome-steps {
  list-style: none; padding: 0; margin: 0 0 18px;
  display: grid; grid-template-columns: 1fr; gap: 10px;
}
.welcome-step, .welcome-bonus {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 13px 16px;
  background: rgba(255, 255, 255, .035);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 12px;
  transition: background .25s, border-color .25s, transform .25s cubic-bezier(.2, .8, .2, 1);
}
.welcome-step:hover, .welcome-bonus:hover {
  background: rgba(255, 255, 255, .06);
  border-color: rgba(255, 102, 51, .35);
  transform: translateX(2px);
}
.welcome-step-num {
  flex: none;
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: linear-gradient(180deg, var(--accent), #c14a23);
  color: #fff; font-weight: 800; font-size: 15px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35), 0 2px 6px rgba(255, 102, 51, .35);
}
.welcome-bonus-icon {
  flex: none;
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 17px;
  background: rgba(255, 102, 51, .12);
  border: 1px solid rgba(255, 102, 51, .30);
  border-radius: 50%;
}
.welcome-step-title { font-weight: 700; font-size: 15px; color: #fff; margin-bottom: 3px; }
.welcome-step-desc  { font-size: 13px; line-height: 1.45; color: rgba(255, 255, 255, .68); }
.welcome-bonus { margin-bottom: 24px; background: rgba(255, 102, 51, .06); border-color: rgba(255, 102, 51, .25); }
.welcome-cta {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(180deg, #ff7d45, var(--accent) 60%, #df4d1f);
  border: 1.5px solid rgba(255, 255, 255, .15);
  border-radius: 12px;
  color: #fff; font-family: inherit; font-size: 16px; font-weight: 800;
  letter-spacing: 0.01em; text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(255, 102, 51, .35), inset 0 1px 0 rgba(255, 255, 255, .25);
  transition: transform .25s cubic-bezier(.2, .8, .2, 1), box-shadow .25s;
  position: relative; overflow: hidden;
}
.welcome-cta::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, .35) 50%, transparent 70%);
  transform: translateX(-130%);
  pointer-events: none;
  transition: transform 0s;
}
.welcome-cta:hover { transform: translateY(-1px); box-shadow: 0 12px 30px rgba(255, 102, 51, .50), inset 0 1px 0 rgba(255, 255, 255, .25); }
.welcome-cta:hover::after { transform: translateX(130%); transition: transform .85s cubic-bezier(.25, .1, .25, 1); }
.welcome-cta:active { transform: translateY(0); }
.welcome-cta span { font-size: 18px; font-weight: 700; }
.welcome-tag {
  margin: 14px 0 0;
  text-align: center;
  font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, .55);
  font-style: italic;
}
@media (max-width: 720px) {
  .welcome-modal { padding: 12px; }
  .welcome-panel { padding: 28px 20px 24px; border-radius: 14px; }
  .welcome-close { top: 10px; right: 10px; width: 32px; height: 32px; font-size: 20px; }
  .welcome-brand { gap: 12px; margin-bottom: 18px; }
  .welcome-logo-tile { width: 48px; height: 48px; border-radius: 10px; }
  .welcome-brand-name { font-size: 17px; line-height: 17px; }
  .welcome-brand-sub  { font-size: 11px; line-height: 12px; }
  .welcome-video-wrap { margin: 2px 0 18px; border-radius: 12px; }
  .welcome-title { font-size: 20px; line-height: 1.22; margin-bottom: 12px; }
  .welcome-desc  { font-size: 13.5px; margin-bottom: 22px; }
  .welcome-section-label { margin-bottom: 12px; }
  .welcome-step, .welcome-bonus { padding: 11px 13px; gap: 12px; }
  .welcome-step-num, .welcome-bonus-icon { width: 28px; height: 28px; font-size: 13px; }
  .welcome-bonus-icon { font-size: 15px; }
  .welcome-step-title { font-size: 14px; }
  .welcome-step-desc  { font-size: 12.5px; }
  .welcome-cta { padding: 14px 18px; font-size: 15px; }
  .welcome-tag { font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .welcome-panel, .welcome-cta::after { animation: none !important; transition: none !important; }
}
</style>
