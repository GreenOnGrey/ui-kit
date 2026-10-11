import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  Avatar, Button, Empty, GitHubIcon, Icon, IconButton, Loading, Markdown, Menu, Modal, Switch, Tabs, TopBar, useToast,
  type LinkComponent,
} from "../src";
import { ICON_NAMES } from "../src/components/Icon";
import tokensCss from "../src/styles/tokens.css?raw";
import { LoginScreen } from "../src/login";
import pkg from "../package.json";
import { ChatDemo } from "./ChatDemo";
import { Example, Section } from "./Example";
import { SECTIONS } from "./sections";

type Theme = "light" | "dark" | "system";
const params = new URLSearchParams(location.search);
/** The page inside the frame of phone width: only the sections. */
const EMBED = params.has("embed");

const Link: LinkComponent = ({ href, children, ...rest }) => <a href={href} {...rest} onClick={(e) => { e.preventDefault(); rest.onClick?.(); }}>{children}</a>;

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (params.get("theme") as Theme) || (localStorage.getItem("uikit-theme") as Theme) || "system"; } catch { return "system"; }
  });
  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("uikit-theme", theme); } catch { /* a private window */ }
  }, [theme]);
  return [theme, setTheme];
}

export function App() {
  const [theme, setTheme] = useTheme();
  const [phone, setPhone] = useState(false);
  const [toc, setToc] = useState(false);
  const [hash, setHash] = useState(location.hash.slice(1) || "tokens");
  useEffect(() => {
    const on = () => setHash(location.hash.slice(1) || "tokens");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  // the sign-in screen takes the whole window, so the showcase shows it in a frame
  const view = params.get("view");
  if (view === "login-nabu") return <LoginDemo product="nabu" />;
  if (view === "login-hammurapi") return <LoginDemo product="hammurapi" error />;
  if (EMBED) return <div className="sc-main" style={{ height: "100%" }}><Sections /></div>;
  return (
    <div className="sc">
      <div className="topbar">
        <a href="#tokens" className="brand"><img src="./nabu.jpg" alt="" /><span>UI Kit</span></a>
        <span className="chip sc-version">v{pkg.version}</span>
        <div className="top-actions">
          <button className={`btn sm${phone ? " primary" : " ghost"} sc-hide-m`} aria-pressed={phone} onClick={() => setPhone((v) => !v)}>
            <Icon name="grid" size={14} />Ширина телефона
          </button>
          <div className="mini-seg" role="group" aria-label="Тема">
            {(["light", "dark", "system"] as const).map((t) => (
              <button key={t} className={theme === t ? "on" : ""} aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {t === "light" ? "Светлая" : t === "dark" ? "Тёмная" : "Системная"}
              </button>
            ))}
          </div>
          <IconButton label="Разделы" className="sc-only-m" on={toc} onClick={() => setToc((v) => !v)}><Icon name={toc ? "x" : "menu"} /></IconButton>
        </div>
      </div>
      <div className="sc-body">
        <nav className={`sc-toc${toc ? " sc-open" : ""}`} aria-label="Разделы">
          {SECTIONS.map(([id, title]) => <a key={id} href={`#${id}`} className={hash === id ? "sc-on" : undefined} onClick={() => setToc(false)}>{title}</a>)}
        </nav>
        {phone
          ? <div className="sc-main sc-phone"><iframe title="Ширина телефона" src={`?embed=1&theme=${theme}#${hash}`} key={`${theme}${hash}`} /></div>
          : <div className="sc-main"><Sections /></div>}
      </div>
    </div>
  );
}

function Sections() {
  // the section of the address is shown on opening, also inside the frame of phone width
  useEffect(() => {
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, []);
  return (
    <>
      <Section id="tokens" lead="Цвета, радиусы, тени и шрифты. Значения меняются вместе с темой. Зелёный и янтарный — только статусы.">
        <Tokens />
      </Section>

      <Section id="type" lead="Onest — текст, JetBrains Mono — код и идентификаторы. Тона текста — классами.">
        <Example>
          <div className="stack">
            <div>Основной текст, 15 px</div>
            <div className="t2">Вторичный текст — <span className="mono">.t2</span></div>
            <div className="muted">Приглушённый текст — <span className="mono">.muted</span></div>
            <div className="small">Мелкий текст, 13 px — <span className="mono">.small</span></div>
            <div><span className="mono">FTR.NAB.CMN-0005</span> — <span className="mono">.mono</span></div>
            <div><span className="ok-t">Готово</span> · <span className="warn-t">Ждёт</span> · <span className="err-t">Ошибка</span></div>
          </div>
        </Example>
      </Section>

      <Section id="buttons" lead="Действие. Основная — одна на экран или окно. Применяются классами или компонентами Button и IconButton.">
        <Example label="Варианты">
          <div className="row"><Button variant="primary">Сохранить</Button><Button>Отмена</Button><Button variant="ghost">Позже</Button><Button variant="danger">Удалить</Button></div>
        </Example>
        <Example label="Малый размер">
          <div className="row"><Button variant="primary" size="sm"><Icon name="plus" size={14} />Добавить</Button><Button size="sm">Изменить</Button></div>
        </Example>
        <Example label="Выключено">
          <div className="row"><Button variant="primary" disabled>Сохранить</Button><Button disabled>Отмена</Button></div>
        </Example>
        <Example label="Кнопка-иконка: обычная, основная, запись, включённая, выключенная">
          <div className="row">
            <IconButton label="Прикрепить"><Icon name="clip" /></IconButton>
            <IconButton label="Отправить" fill><Icon name="send" /></IconButton>
            <IconButton label="Остановить запись" className="rec"><Icon name="mic" /></IconButton>
            <IconButton label="Разделы" on><Icon name="menu" /></IconButton>
            <IconButton label="Недоступно" disabled><Icon name="mic" /></IconButton>
          </div>
        </Example>
        <Example label="Кнопка как ссылка"><button className="linkish">Показать все</button></Example>
      </Section>

      <Section id="forms" lead="Подпись над полем, подсказка или ошибка — под ним. Форма в две колонки складывается в одну на телефоне.">
        <Example>
          <div className="form-grid">
            <div className="field"><label htmlFor="f1">Название</label><input id="f1" className="inp" defaultValue="Релиз 1.4" /><div className="hint">До 120 знаков</div></div>
            <div className="field"><label htmlFor="f2">Адрес</label><input id="f2" className="inp" defaultValue="nabu.example" aria-invalid="true" /><div className="err-text">Укажите адрес с https://</div></div>
            <div className="field"><label htmlFor="f3">Часовой пояс</label><select id="f3" className="inp"><option>Europe/Moscow</option><option>UTC</option></select></div>
            <div className="field"><label htmlFor="f4">Заметка</label><textarea id="f4" className="inp" rows={2} defaultValue="Текст" /></div>
          </div>
        </Example>
        <Example label="Переключатель"><SwitchDemo /></Example>
        <Example label="Поиск"><form className="search" role="search" style={{ maxWidth: 320 }}><Icon name="search" /><input placeholder="Поиск" aria-label="Поиск" /></form></Example>
      </Section>

      <Section id="chips" lead="Чип — выбор из немногих значений или метка. Вкладки переключают вид; стрелки двигают выбор.">
        <Example label="Чипы"><div className="chips"><button className="chip">EN</button><button className="chip on">RU</button><span className="chip"><Icon name="clip" size={12} />план.pdf</span></div></Example>
        <Example label="Вкладки"><TabsDemo /></Example>
        <Example label="Сегменты"><div className="mini-seg"><button className="on" aria-pressed="true">День</button><button aria-pressed="false">Неделя</button><button aria-pressed="false">Месяц</button></div></Example>
        <Example label="Статус: обычный и черновик"><div className="row"><span className="st">Активен</span><span className="st draft">Черновик</span></div></Example>
      </Section>

      <Section id="data" lead="Таблица, числа, пары «ключ — значение», панель.">
        <Example label="Числа"><div className="kpi"><div><b>128</b><span>Запросов</span></div><div><b>$4.20</b><span>Стоимость</span></div><div><b>3 / 8</b><span>Подов</span></div></div></Example>
        <Example label="Таблица">
          <table className="t">
            <thead><tr><th>Пользователь</th><th>Статус</th><th>Запросов</th></tr></thead>
            <tbody>
              <tr><td>Ада Лавлейс</td><td><span className="st">Активен</span></td><td className="num">128</td></tr>
              <tr className="sel"><td>Алан Тьюринг</td><td><span className="st draft">Черновик</span></td><td className="num">12</td></tr>
            </tbody>
          </table>
        </Example>
        <Example label="Ключ — значение"><dl className="kv"><dt>Модель</dt><dd className="mono">sonnet</dd><dt>Создан</dt><dd>11 октября</dd></dl></Example>
        <Example label="Строки настроек">
          <div className="stack"><div className="kvrow"><span className="muted">Бюджет</span><b>$10</b></div><div className="kvrow"><span className="muted">Дни</span><b>Пн–Пт</b></div></div>
        </Example>
        <Example label="Панель">
          <aside className="panel" style={{ maxWidth: 360 }}><div className="panel-h"><b className="grow">Заметка</b><IconButton label="Закрыть"><Icon name="x" size={16} /></IconButton></div><div className="small t2">Содержимое панели.</div></aside>
        </Example>
      </Section>

      <Section id="messages" lead="Подсказка, предупреждение и ошибка модели — блоком в потоке страницы.">
        <Example label="Подсказка"><div className="hintbox"><Icon name="bulb" /><div>Подключите почту, чтобы агент разбирал письма.</div></div></Example>
        <Example label="Предупреждение"><div className="hintbox warn"><Icon name="alert" /><div>Свободной ёмкости нет: сообщения ждут в очереди.</div></div></Example>
        <Example label="Ошибка модели: временная и постоянная">
          <div className="stack">
            <div className="llmerr amber" role="alert"><span>Модель временно недоступна. Повторите запрос.</span><div className="row"><button className="btn sm"><Icon name="refresh" size={14} />Повторить</button></div></div>
            <div className="llmerr" role="alert"><span>Ключ модели отклонён. Обратитесь к администратору.</span></div>
          </div>
        </Example>
        <Example label="Текст ошибки под полем"><div className="err-text">Не удалось сохранить.</div></Example>
      </Section>

      <Section id="overlay" lead="Меню закрывается по Escape и нажатию снаружи. Модальное окно ставит фокус в первое поле.">
        <Example label="Меню" source={<div className="menu" role="dialog" aria-label="Профиль">{profileSections}</div>}><MenuDemo /></Example>
        <Example label="Модальное окно: обычное и широкое" source={<Modal title="Новая тема" onClose={noop} footer={modalFooter(noop)}>{modalBody}</Modal>}><ModalDemo /></Example>
      </Section>

      <Section id="toasts" lead="Без действий исчезает через 6 секунд; с действиями остаётся до выбора.">
        <Example source={
          <div className="toast error" role="alert">
            <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
              <div className="grow"><b>Не удалось сохранить</b><span className="small t2">Сервер недоступен.</span></div>
              <IconButton label="Закрыть" style={{ width: 24, height: 24 }}><Icon name="x" size={14} /></IconButton>
            </div>
          </div>
        }><ToastDemo /></Example>
      </Section>

      <Section id="avatars" lead="Пользователь — картинка или инициалы. Агент — иконка и цветовой вариант, которые передаёт продукт.">
        <Example label="Пользователь"><div className="row"><Avatar name="Ада Лавлейс" /><Avatar name="Алан" small /></div></Example>
        <Example label="Агент: business, friendly, brief, mentor">
          <div className="row">
            <Avatar name="Ада" agent icon="tBusiness" variant="business" /><Avatar name="Ада" agent icon="tFriendly" variant="friendly" />
            <Avatar name="Ада" agent icon="tBrief" variant="brief" /><Avatar name="Ада" agent icon="tMentor" variant="mentor" />
            <Avatar name="Ада" agent icon="tBusiness" variant="business" small />
          </div>
        </Example>
      </Section>

      <Section id="icons" lead="Штриховые иконки обоих продуктов. Щелчок копирует имя.">
        <Icons />
      </Section>

      <Section id="topbar" lead="Логотип и название, разделы, действия продукта, аватар с меню профиля. На телефоне разделы уходят под бургер после аватара.">
        <Example label="Nabu" box><BarDemo product="nabu" /></Example>
        <Example label="Hammurapi: поиск и «Новая задача» — действия продукта" box><BarDemo product="hammurapi" /></Example>
      </Section>

      <Section id="login" lead="Тёмный экран в обеих темах. Логотип, название, девиз и поставщика входа передаёт продукт.">
        <Example label="Nabu" box source={<LoginDemo product="nabu" />}><LoginFrame view="login-nabu" /></Example>
        <Example label="Hammurapi, ошибка входа" box source={<LoginDemo product="hammurapi" error />}><LoginFrame view="login-hammurapi" /></Example>
      </Section>

      <Section id="chat" lead="Данные вымышленные, кнопки работают без сервера. Отмена хода, подтверждение, вложения и голос есть, только когда продукт передал обработчик.">
        <Example label="История: подписи, шаги, вложения, ошибка с повтором" box><ChatDemo /></Example>
        <Example label="Пустой разговор" box><ChatDemo empty /></Example>
        <Example label="Агент печатает: шаг выполняется, текста ещё нет" box><ChatDemo typing /></Example>
        <Example label="История не загрузилась; ранние сообщения подгружаются" box><ChatDemo historyError /></Example>
        <Example label="Агент запускается" box><ChatDemo wait="starting" /></Example>
        <Example label="В очереди" box><ChatDemo wait="queued" /></Example>
        <Example label="Отмена хода и подтверждение действия" box><ChatDemo full /></Example>
        <Example label="Только чтение" box><ChatDemo readOnly /></Example>
        <Example label="Запись голоса: вместо поля — отсчёт; доступ к микрофону запрещён — текст под полем" box>
          <div>
            <div className="composer">
              <IconButton label="Прикрепить файлы"><Icon name="clip" /></IconButton>
              <div className="rec-box">Запись… 0:07 с</div>
              <IconButton label="Остановить запись" className="rec"><Icon name="mic" /></IconButton>
              <IconButton label="Отправить" fill disabled><Icon name="send" /></IconButton>
            </div>
            <div className="err-text" style={{ padding: "0 12px 8px" }}>Нет доступа к микрофону</div>
          </div>
        </Example>
        <Example label="Проверка расшифровки перед отправкой" box>
          <div className="transcript" style={{ margin: 10 }}>
            <div className="small muted" style={{ marginBottom: 4 }}>Проверьте расшифровку перед отправкой</div>
            <textarea className="inp" rows={3} defaultValue="Напомни завтра в десять про ревью." aria-label="Проверьте расшифровку перед отправкой" />
            <div className="row2" style={{ marginTop: 8 }}><button className="btn ghost sm">Удалить</button><button className="btn primary sm">Отправить</button></div>
          </div>
        </Example>
        <Example label="Выбранные файлы над полем" box>
          <div className="pending-files">
            <span className="chip"><Icon name="clip" size={12} />план.pdf<IconButton label="Убрать" style={{ width: 18, height: 18 }}><Icon name="x" size={12} /></IconButton></span>
          </div>
        </Example>
        <Example label="Узкое место — боковая панель: режимы над полем, список разговоров поверх ленты">
          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            <div className="sc-stage sc-box"><ChatDemo narrow modes full /></div>
            <div className="sc-stage sc-box"><ChatDemo narrow listOpen /></div>
          </div>
        </Example>
      </Section>

      <Section id="states" lead="Пусто и загрузка.">
        <Example label="Пусто"><Empty icon="files" title="Файлов пока нет">Они появятся, когда агент сохранит первый.</Empty></Example>
        <Example label="Загрузка"><Loading /></Example>
        <Example label="Индикатор"><div className="turnstate" style={{ justifyContent: "flex-start" }}><span className="spin" aria-hidden="true" />Агент запускается…</div></Example>
      </Section>

      <Section id="markdown" lead="Заголовки, списки, таблицы, код, выделение. Разметка из текста не вставляется.">
        <Example><Markdown text={"## Итог\n\nПокрыто **24** требования из 26.\n\n1. `KIT-01` — токены\n2. `NAB-01` — сравнение экранов\n\n| Шаг | Статус |\n|---|---|\n| 1 | готов |\n\n```\nnpm run lint\n```"} /></Example>
      </Section>
    </>
  );
}

/** The declarations of the first rule with this selector in tokens.css. */
function tokensOf(selector: string): Record<string, string> {
  const from = tokensCss.indexOf(`${selector} {`);
  const body = tokensCss.slice(tokensCss.indexOf("{", from) + 1, tokensCss.indexOf("}", from));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].replace(/\s+/g, " ").trim()]));
}
const LIGHT = tokensOf(":root");
const DARK = tokensOf(':root[data-theme="dark"]');
const isColor = (v: string) => /^#|^rgba?\(/.test(v);

/** Every token with its value in the light and in the dark theme, read from tokens.css. */
function Tokens() {
  const names = Object.keys(LIGHT);
  const sample = (name: string, value: string): ReactNode =>
    isColor(value) ? <span style={{ background: value }} />
      : name.startsWith("--r-") ? <span style={{ borderRadius: value, background: "var(--violet-soft)" }} />
      : name === "--shadow" ? <span style={{ boxShadow: value, background: "var(--surface)" }} />
      : <span style={{ display: "grid", placeItems: "center", fontFamily: name === "--font" || name === "--mono" ? value : undefined }}>Aa</span>;
  return (
    <table className="t">
      <thead><tr><th>Токен</th><th>Светлая тема</th><th>Тёмная тема</th></tr></thead>
      <tbody>
        {names.map((n) => (
          <tr key={n}>
            <td className="mono">{n}</td>
            <td><div className="sc-sw">{sample(n, LIGHT[n])}<code>{LIGHT[n]}</code></div></td>
            <td>{DARK[n] ? <div className="sc-sw">{sample(n, DARK[n])}<code>{DARK[n]}</code></div> : <span className="muted">как в светлой</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Icons() {
  const [copied, setCopied] = useState("");
  return (
    <div className="sc-icons">
      {ICON_NAMES.map((n) => (
        <button key={n} title={n} onClick={() => { void navigator.clipboard?.writeText(n); setCopied(n); }}>
          <Icon name={n} size={20} />{copied === n ? "скопировано" : n}
        </button>
      ))}
    </div>
  );
}

function SwitchDemo() {
  const [on, setOn] = useState(true);
  return <div className="row"><Switch on={on} onChange={setOn} label="Голосовой ввод" /><Switch on={false} onChange={() => {}} label="Недоступно" disabled /></div>;
}

function TabsDemo() {
  const [tab, setTab] = useState("table");
  return <Tabs label="Вид" value={tab} onChange={setTab} items={[{ key: "table", label: "Таблица" }, { key: "graph", label: "Граф" }, { key: "tasks", label: "Задания" }]} />;
}

const noop = () => {};
const profileSections: ReactNode = (
  <>
    <div className="sec"><div className="row"><Avatar name="Ада Лавлейс" /><div><b>Ада Лавлейс</b><div className="small muted">ada@example.com</div></div></div></div>
    <div className="sec"><div className="line"><span>Тема</span><div className="mini-seg"><button className="on">Светлая</button><button>Тёмная</button></div></div></div>
    <div className="sec"><button className="action"><Icon name="plug" />Подключения</button><button className="action danger"><Icon name="out" />Выйти</button></div>
  </>
);
const modalBody: ReactNode = <div className="field"><label htmlFor="m1">Тема</label><input id="m1" className="inp" /><div className="hint">У темы своя история.</div></div>;
const modalFooter = (close: () => void): ReactNode => <><Button variant="ghost" onClick={close}>Отмена</Button><Button variant="primary" onClick={close}>Создать</Button></>;

function MenuDemo() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div style={{ position: "relative", height: open ? 190 : "auto" }}>
      <Button onMouseDown={(e) => open && e.stopPropagation()} onClick={() => setOpen((v) => !v)} aria-expanded={open}>Открыть меню</Button>
      {open && (
        <div style={{ position: "absolute", left: 0, top: 0, width: 372, height: 0 }}>
          <Menu onClose={close} label="Профиль">{profileSections}</Menu>
        </div>
      )}
    </div>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState<"" | "plain" | "wide">("");
  const close = useCallback(() => setOpen(""), []);
  return (
    <div className="row">
      <Button onClick={() => setOpen("plain")}>Открыть окно</Button>
      <Button onClick={() => setOpen("wide")}>Открыть широкое окно</Button>
      {open && (
        <Modal title="Новая тема" wide={open === "wide"} onClose={close} footer={modalFooter(close)}>{modalBody}</Modal>
      )}
    </div>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="row">
      <Button onClick={() => toast({ kind: "ok", title: "Сохранено" })}>Успех</Button>
      <Button onClick={() => toast({ kind: "error", title: "Не удалось сохранить", text: "Сервер недоступен." })}>Ошибка</Button>
      <Button onClick={() => toast({ title: "Вышла новая версия", actions: [{ label: "Обновить", primary: true, onClick: () => {} }, { label: "Позже", onClick: () => {} }] })}>С действиями</Button>
    </div>
  );
}

const profile = (close: () => void): ReactNode => <Menu onClose={close} label="Профиль">{profileSections}</Menu>;

function BarDemo({ product }: { product: "nabu" | "hammurapi" }) {
  const nabu = product === "nabu";
  const names = nabu ? ["Чат", "Память", "Пространство", "Задания"] : ["Общее", "Спецификация", "Исследование", "Разработка", "Поставка"];
  const [on, setOn] = useState(0);
  // the links of the showcase lead nowhere: a click only marks the section
  const pick = (e: MouseEvent) => {
    const i = names.indexOf((e.target as HTMLElement).closest("a")?.textContent ?? "");
    if (i >= 0) setOn(i);
  };
  return (
    <div style={{ minHeight: 230 }} onClick={pick}>
      <TopBar logo={nabu ? "./nabu.jpg" : "./hammurapi.png"} name={nabu ? "Nabu" : "Hammurapi"} Link={Link} avatar={<Avatar name="Ада Лавлейс" />} profileMenu={profile}
        sections={names.map((label, i) => ({ key: String(i), label, href: "#topbar", active: i === on }))}
        center={nabu ? undefined : <form className="search" role="search"><Icon name="search" /><input placeholder="Поиск" aria-label="Поиск" /></form>}
        actions={nabu ? undefined : <button className="btn primary sm"><Icon name="plus" /><span className="hide-m">Новая задача</span></button>} />
    </div>
  );
}

function LoginFrame({ view }: { view: string }) {
  return <iframe className="sc-login" title={view} src={`?view=${view}`} />;
}

function LoginDemo({ product, error }: { product: "nabu" | "hammurapi"; error?: boolean }) {
  const nabu = product === "nabu";
  const [lang, setLang] = useState("ru");
  return (
    <LoginScreen logo={nabu ? "./nabu.jpg" : "./hammurapi.png"} logoAlt={nabu ? "Логотип Nabu" : "Логотип Hammurapi"}
      name={nabu ? "NABU" : "HAMMURAPI"} tagline={nabu ? "Building AI future together" : "Спецификация — источник истины"}
      signIn={{ href: "#login", label: "Войти через GitHub", icon: <GitHubIcon /> }} note="Только для участников организации GreenOnGrey"
      error={error ? "Не удалось войти. Попробуйте ещё раз." : undefined}
      languages={["en", "ru", "de", "es", "zh"].map((code) => ({ code, label: code.toUpperCase(), active: code === lang }))} onLanguage={setLang} />
  );
}
