import { useState } from "react";
import Icon from "@/components/ui/icon";

type View = "dashboard" | "paths" | "participants" | "achievements" | "profile" | "integration";
type Role = "owner" | "participant";

interface Path {
  id: number;
  title: string;
  description: string;
  levels: number;
  locked: boolean;
  participants: number;
  icon: string;
}

interface Participant {
  id: number;
  name: string;
  phone: string;
  role: string;
  progress: number;
  paths: number;
  avatar: string;
}

const PATHS: Path[] = [
  { id: 1, title: "Путь Теней", description: "Испытание для избранных. Семь уровней мрака ведут к истине.", levels: 7, locked: false, participants: 14, icon: "🌑" },
  { id: 2, title: "Путь Света", description: "Восхождение к знанию через загадки древних мудрецов.", levels: 5, locked: false, participants: 23, icon: "✨" },
  { id: 3, title: "Путь Огня", description: "Только стойкие духом пройдут сквозь пламя испытаний.", levels: 9, locked: true, participants: 7, icon: "🔥" },
  { id: 4, title: "Путь Воды", description: "Текучесть мышления — ключ к скрытым истинам бытия.", levels: 6, locked: true, participants: 0, icon: "💧" },
];

const PARTICIPANTS: Participant[] = [
  { id: 1, name: "Александра Волкова", phone: "+7 900 123-45-67", role: "Участник", progress: 85, paths: 2, avatar: "А" },
  { id: 2, name: "Михаил Орлов", phone: "+7 912 234-56-78", role: "Участник", progress: 62, paths: 1, avatar: "М" },
  { id: 3, name: "Елена Звёздная", phone: "+7 924 345-67-89", role: "Мастер", progress: 100, paths: 3, avatar: "Е" },
  { id: 4, name: "Дмитрий Тёмный", phone: "+7 936 456-78-90", role: "Участник", progress: 31, paths: 1, avatar: "Д" },
  { id: 5, name: "Ольга Лунная", phone: "+7 948 567-89-01", role: "Участник", progress: 94, paths: 2, avatar: "О" },
];

const ACHIEVEMENTS = [
  { participant: "Елена Звёздная", path: "Путь Теней", level: 7, time: "2ч 14м", date: "28.03.2026" },
  { participant: "Ольга Лунная", path: "Путь Света", level: 5, time: "3ч 42м", date: "27.03.2026" },
  { participant: "Александра Волкова", path: "Путь Теней", level: 6, time: "4ч 08м", date: "27.03.2026" },
  { participant: "Михаил Орлов", path: "Путь Света", level: 4, time: "5ч 17м", date: "26.03.2026" },
  { participant: "Дмитрий Тёмный", path: "Путь Теней", level: 2, time: "1ч 55м", date: "25.03.2026" },
];

export default function Index() {
  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState<Role>("owner");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePathId, setActivePathId] = useState<number | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [answerResult, setAnswerResult] = useState<null | "correct" | "wrong">(null);
  const [integrationModal, setIntegrationModal] = useState(false);
  const [inviteModal, setInviteModal] = useState<number | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  const handleLogin = () => {
    if (loginPhone && loginPass) {
      setIsLoggedIn(true);
      setView("dashboard");
    }
  };

  const handleAnswer = () => {
    if (answerInput.toLowerCase().includes("свет") || answerInput.toLowerCase().includes("ключ")) {
      setAnswerResult("correct");
    } else {
      setAnswerResult("wrong");
    }
    setTimeout(() => setAnswerResult(null), 3000);
  };

  const navItems = role === "owner"
    ? [
        { id: "dashboard", label: "Панель", icon: "LayoutDashboard" },
        { id: "paths", label: "Пути", icon: "Map" },
        { id: "participants", label: "Участники", icon: "Users" },
        { id: "achievements", label: "Достижения", icon: "Trophy" },
        { id: "integration", label: "Интеграция", icon: "Link" },
        { id: "profile", label: "Кабинет", icon: "User" },
      ]
    : [
        { id: "dashboard", label: "Главная", icon: "Home" },
        { id: "paths", label: "Мои Пути", icon: "Map" },
        { id: "achievements", label: "Прогресс", icon: "Trophy" },
        { id: "profile", label: "Кабинет", icon: "User" },
      ];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background bg-mystic-pattern star-field flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(260 60% 50%), transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(230 60% 40%), transparent)" }} />

        <div className="relative z-10 text-center mb-10 animate-fade-in-up opacity-0-init">
          <div className="text-6xl mb-4 animate-float">⚜️</div>
          <h1 className="font-cormorant text-6xl font-light tracking-widest gold-gradient mb-2">
            Мастер Путей
          </h1>
          <p className="font-montserrat text-xs tracking-[0.3em] text-muted-foreground uppercase">
            Квестовая сеть
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16" style={{ background: "linear-gradient(to right, transparent, hsl(45 80% 55%))" }} />
            <span className="ornament text-xs">✦</span>
            <div className="h-px w-16" style={{ background: "linear-gradient(to left, transparent, hsl(45 80% 55%))" }} />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-sm mx-4 animate-fade-in-up opacity-0-init delay-200">
          <div className="card-mystic rounded-2xl p-8">
            <h2 className="font-cormorant text-2xl text-center mb-6 tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>
              Вход в систему
            </h2>

            <div className="flex rounded-xl overflow-hidden mb-6" style={{ border: "1px solid hsl(45 60% 40% / 0.3)" }}>
              <button
                onClick={() => setRole("owner")}
                className="flex-1 py-2.5 text-xs font-montserrat tracking-widest uppercase transition-all cursor-pointer"
                style={role === "owner" ? {
                  background: "linear-gradient(135deg, hsl(45 85% 50%), hsl(38 75% 42%))",
                  color: "hsl(240 20% 6%)",
                  fontWeight: 600,
                } : { color: "hsl(240 10% 55%)" }}
              >
                Владелец
              </button>
              <button
                onClick={() => setRole("participant")}
                className="flex-1 py-2.5 text-xs font-montserrat tracking-widest uppercase transition-all cursor-pointer"
                style={role === "participant" ? {
                  background: "linear-gradient(135deg, hsl(45 85% 50%), hsl(38 75% 42%))",
                  color: "hsl(240 20% 6%)",
                  fontWeight: 600,
                } : { color: "hsl(240 10% 55%)" }}
              >
                Участник
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  placeholder="+7 900 000-00-00"
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                  className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none transition-all"
                  style={{ border: "1px solid hsl(45 60% 40% / 0.2)", color: "hsl(45 60% 90%)" }}
                  onFocus={e => (e.target.style.borderColor = "hsl(45 80% 55% / 0.5)")}
                  onBlur={e => (e.target.style.borderColor = "hsl(45 60% 40% / 0.2)")}
                />
              </div>
              <div>
                <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none transition-all"
                  style={{ border: "1px solid hsl(45 60% 40% / 0.2)", color: "hsl(45 60% 90%)" }}
                  onFocus={e => (e.target.style.borderColor = "hsl(45 80% 55% / 0.5)")}
                  onBlur={e => (e.target.style.borderColor = "hsl(45 60% 40% / 0.2)")}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>
              <button onClick={handleLogin} className="gold-btn w-full py-3 rounded-xl mt-1 cursor-pointer">
                Войти в систему
              </button>
            </div>

            <p className="text-center text-xs font-montserrat text-muted-foreground mt-4">
              <button className="hover:underline transition-colors" style={{ color: "hsl(45 70% 60%)" }}>
                Забыли пароль?
              </button>
            </p>
          </div>

          <p className="text-center text-xs font-montserrat text-muted-foreground mt-4 tracking-wide">
            Нет аккаунта?{" "}
            <button className="underline transition-colors" style={{ color: "hsl(45 70% 60%)" }}>
              Получить приглашение
            </button>
          </p>
        </div>

        <div className="relative z-10 mt-12 flex items-center gap-3 text-muted-foreground animate-fade-in opacity-0-init delay-500">
          <span className="text-xs font-montserrat tracking-[0.25em] uppercase">Квестовая сеть</span>
          <span className="ornament">✦</span>
          <span className="text-xs font-montserrat tracking-[0.25em] uppercase">2026</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "hsl(240 18% 7%)", borderRight: "1px solid hsl(45 60% 40% / 0.15)" }}
      >
        <div className="p-6 border-b" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚜️</span>
            <div>
              <h1 className="font-cormorant text-xl tracking-widest" style={{ color: "hsl(45 80% 70%)" }}>
                Мастер Путей
              </h1>
              <p className="text-xs font-montserrat tracking-widest text-muted-foreground uppercase">
                {role === "owner" ? "Владелец" : "Участник"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id as View); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-montserrat tracking-wide transition-all cursor-pointer"
              style={view === item.id ? {
                background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(38 70% 42%))",
                color: "hsl(240 20% 6%)",
                fontWeight: 600,
              } : { color: "hsl(240 10% 55%)" }}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
          <button
            onClick={() => { setIsLoggedIn(false); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-montserrat text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Icon name="LogOut" size={16} />
            Выйти
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="nav-glass sticky top-0 z-30 flex items-center px-6 py-4 gap-4">
          <button className="lg:hidden cursor-pointer" onClick={() => setSidebarOpen(true)}>
            <Icon name="Menu" size={20} />
          </button>
          <h2 className="font-cormorant text-xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>
            {navItems.find(n => n.id === view)?.label}
          </h2>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-montserrat font-bold"
              style={{ background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(260 50% 40%))", color: "hsl(240 20% 6%)" }}>
              {role === "owner" ? "В" : "А"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div className="space-y-8 animate-fade-in-up opacity-0-init">
              <div>
                <h1 className="font-cormorant text-4xl font-light tracking-wider mb-1" style={{ color: "hsl(45 60% 85%)" }}>
                  {role === "owner" ? "Добро пожаловать, Владелец" : "Добро пожаловать, Путник"}
                </h1>
                <p className="text-xs font-montserrat text-muted-foreground tracking-wide">
                  {new Date().toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Активных Путей", value: "4", icon: "Map", color: "hsl(45 80% 60%)" },
                  { label: "Участников", value: "47", icon: "Users", color: "hsl(260 60% 65%)" },
                  { label: "Прохождений", value: "213", icon: "Trophy", color: "hsl(45 80% 60%)" },
                  { label: "Сайтов в сети", value: "3", icon: "Globe", color: "hsl(260 60% 65%)" },
                ].map((stat, i) => (
                  <div key={i} className={`card-mystic rounded-2xl p-5 animate-fade-in-up opacity-0-init delay-${(i + 1) * 100}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground leading-tight">{stat.label}</span>
                      <Icon name={stat.icon} size={15} style={{ color: stat.color }} />
                    </div>
                    <p className="font-cormorant text-4xl" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="card-mystic rounded-2xl p-6">
                <h3 className="font-cormorant text-xl mb-4 tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>
                  Последние события
                </h3>
                <div className="space-y-0">
                  {[
                    { text: "Елена Звёздная завершила Путь Теней", time: "2ч назад", icon: "⚜️" },
                    { text: "Новый участник: Борис Ночной", time: "5ч назад", icon: "👤" },
                    { text: "Путь Огня добавлен в систему", time: "1д назад", icon: "🔥" },
                    { text: "Ольга Лунная достигла 5-го уровня Пути Света", time: "1д назад", icon: "✨" },
                  ].map((event, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0" style={{ borderColor: "hsl(45 60% 40% / 0.1)" }}>
                      <span className="text-base">{event.icon}</span>
                      <p className="flex-1 text-sm font-montserrat" style={{ color: "hsl(45 40% 80%)" }}>{event.text}</p>
                      <span className="text-xs font-montserrat text-muted-foreground whitespace-nowrap">{event.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {role === "owner" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: "🔗", title: "Принять дополнение", desc: "Добавить новый сайт-квест в сеть", action: () => setIntegrationModal(true) },
                    { icon: "🗺️", title: "Создать Путь", desc: "Новый квест с уровнями и загадками", action: () => setView("paths") },
                    { icon: "📨", title: "Пригласить", desc: "Отправить приглашение участнику", action: () => setView("participants") },
                  ].map((item, i) => (
                    <button key={i} onClick={item.action}
                      className="card-mystic rounded-2xl p-5 text-left cursor-pointer">
                      <div className="text-2xl mb-3">{item.icon}</div>
                      <p className="font-cormorant text-lg mb-1" style={{ color: "hsl(45 60% 85%)" }}>{item.title}</p>
                      <p className="text-xs font-montserrat text-muted-foreground">{item.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {role === "participant" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PATHS.map(path => (
                    <button key={path.id}
                      onClick={() => !path.locked && setView("paths")}
                      className={`card-mystic rounded-2xl p-5 text-left ${path.locked ? "path-locked cursor-not-allowed" : "cursor-pointer"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{path.icon}</span>
                        {path.locked
                          ? <Icon name="Lock" size={14} style={{ color: "hsl(240 10% 45%)" }} />
                          : <Icon name="Unlock" size={14} style={{ color: "hsl(45 80% 60%)" }} />
                        }
                      </div>
                      <p className="font-cormorant text-xl mb-1" style={{ color: "hsl(45 60% 85%)" }}>{path.title}</p>
                      <p className="text-xs font-montserrat text-muted-foreground">{path.levels} уровней</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PATHS */}
          {view === "paths" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init">
              <div className="flex items-center justify-between">
                <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>
                  {role === "owner" ? "Управление Путями" : "Мои Пути"}
                </h1>
                {role === "owner" && (
                  <button className="gold-btn px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                    <Icon name="Plus" size={14} />
                    Создать Путь
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {PATHS.map((path, i) => (
                  <div key={path.id}
                    className={`card-mystic rounded-2xl p-6 cursor-pointer animate-fade-in-up opacity-0-init delay-${(i + 1) * 100} ${path.locked && role === "participant" ? "path-locked" : ""}`}
                    onClick={() => !path.locked && setActivePathId(activePathId === path.id ? null : path.id)}>
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-3xl">{path.icon}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full font-montserrat flex items-center gap-1.5"
                        style={path.locked
                          ? { background: "hsl(240 15% 18%)", color: "hsl(240 10% 50%)" }
                          : { background: "hsl(45 80% 55% / 0.15)", color: "hsl(45 80% 70%)" }
                        }>
                        <Icon name={path.locked ? "Lock" : "Unlock"} size={11} />
                        {path.locked ? "Закрыт" : "Открыт"}
                      </span>
                    </div>
                    <h3 className="font-cormorant text-2xl font-light mb-2 tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>
                      {path.title}
                    </h3>
                    <p className="text-sm font-montserrat text-muted-foreground mb-4 leading-relaxed">{path.description}</p>
                    <div className="flex items-center justify-between text-xs font-montserrat text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Icon name="Layers" size={12} />{path.levels} уровней</span>
                      <span className="flex items-center gap-1.5"><Icon name="Users" size={12} />{path.participants} участников</span>
                    </div>

                    {activePathId === path.id && role === "participant" && !path.locked && (
                      <div className="mt-5 pt-5 border-t" style={{ borderColor: "hsl(45 60% 40% / 0.2)" }}>
                        <div className="space-y-2 mb-5">
                          {Array.from({ length: path.levels }, (_, k) => (
                            <div key={k} className="flex items-center gap-3 p-3 rounded-xl"
                              style={{ background: k < 2 ? "hsl(45 80% 55% / 0.08)" : "hsl(240 15% 11%)", border: "1px solid hsl(45 60% 40% / 0.15)" }}>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-montserrat font-bold flex-shrink-0"
                                style={{ background: k < 2 ? "hsl(45 80% 55%)" : "hsl(240 15% 22%)", color: k < 2 ? "hsl(240 20% 6%)" : "hsl(240 10% 50%)" }}>
                                {k + 1}
                              </div>
                              <span className="text-sm font-montserrat flex-1" style={{ color: k < 2 ? "hsl(45 60% 85%)" : "hsl(240 10% 45%)" }}>
                                Уровень {k + 1}
                              </span>
                              {k < 2 && <Icon name="CheckCircle" size={14} style={{ color: "hsl(45 80% 55%)" }} />}
                              {k === 2 && (
                                <button className="gold-btn px-3 py-1 rounded-lg text-xs cursor-pointer" onClick={e => e.stopPropagation()}>
                                  Начать
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-sm font-cormorant italic mb-3" style={{ color: "hsl(45 50% 65%)" }}>
                          "Что стоит у начала жизни и конца времён, но никогда — в середине века?"
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Введите ответ..."
                            value={answerInput}
                            onChange={e => setAnswerInput(e.target.value)}
                            className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm font-montserrat outline-none"
                            style={{ border: "1px solid hsl(45 60% 40% / 0.3)", color: "hsl(45 60% 90%)" }}
                            onClick={e => e.stopPropagation()}
                          />
                          <button onClick={e => { e.stopPropagation(); handleAnswer(); }}
                            className="gold-btn px-4 py-2.5 rounded-xl cursor-pointer">
                            <Icon name="ArrowRight" size={14} />
                          </button>
                        </div>
                        {answerResult === "correct" && (
                          <div className="mt-2 p-3 rounded-xl text-sm font-montserrat text-center animate-scale-in"
                            style={{ background: "hsl(45 80% 55% / 0.12)", color: "hsl(45 80% 70%)", border: "1px solid hsl(45 80% 55% / 0.3)" }}>
                            ✨ Проход открыт! Путь продолжается...
                          </div>
                        )}
                        {answerResult === "wrong" && (
                          <div className="mt-2 p-3 rounded-xl text-sm font-montserrat text-center animate-scale-in"
                            style={{ background: "hsl(0 60% 40% / 0.12)", color: "hsl(0 60% 70%)", border: "1px solid hsl(0 60% 40% / 0.3)" }}>
                            🔒 Ответ неверен. Попробуйте ещё раз.
                          </div>
                        )}
                      </div>
                    )}

                    {role === "owner" && activePathId === path.id && (
                      <div className="mt-4 pt-4 flex gap-2 border-t" style={{ borderColor: "hsl(45 60% 40% / 0.2)" }}>
                        <button className="flex-1 py-2 rounded-xl text-xs font-montserrat tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          style={{ border: "1px solid hsl(45 60% 40% / 0.3)", color: "hsl(45 70% 65%)" }}>
                          <Icon name="Edit" size={12} /> Редактировать
                        </button>
                        <button className="flex-1 py-2 rounded-xl text-xs font-montserrat tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          style={{ border: "1px solid hsl(260 50% 40% / 0.3)", color: "hsl(260 60% 70%)" }}>
                          <Icon name="Settings" size={12} /> Уровни
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PARTICIPANTS */}
          {view === "participants" && role === "owner" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init">
              <div className="flex items-center justify-between">
                <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>
                  Участники
                </h1>
                <button className="gold-btn px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                  <Icon name="UserPlus" size={14} />
                  Пригласить
                </button>
              </div>
              <div className="space-y-3">
                {PARTICIPANTS.map((p, i) => (
                  <div key={p.id}
                    className={`card-mystic rounded-2xl p-5 cursor-pointer animate-fade-in-up opacity-0-init delay-${(i + 1) * 100}`}
                    onClick={() => setSelectedParticipant(selectedParticipant?.id === p.id ? null : p)}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center font-cormorant text-xl font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(260 50% 40%))", color: "hsl(45 90% 92%)" }}>
                        {p.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-montserrat font-semibold text-sm truncate" style={{ color: "hsl(45 60% 85%)" }}>{p.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-montserrat flex-shrink-0"
                            style={{ background: "hsl(260 50% 35% / 0.3)", color: "hsl(260 60% 75%)" }}>
                            {p.role}
                          </span>
                        </div>
                        <p className="text-xs font-montserrat text-muted-foreground">{p.phone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-cormorant text-2xl" style={{ color: "hsl(45 80% 65%)" }}>{p.progress}%</p>
                        <p className="text-xs font-montserrat text-muted-foreground">{p.paths} {p.paths === 1 ? "путь" : "пути"}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "hsl(240 15% 18%)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.progress}%`, background: "linear-gradient(to right, hsl(260 50% 45%), hsl(45 80% 55%))" }} />
                    </div>
                    {selectedParticipant?.id === p.id && (
                      <div className="mt-4 pt-4 border-t flex flex-wrap gap-2" style={{ borderColor: "hsl(45 60% 40% / 0.2)" }}>
                        <button className="px-3 py-1.5 rounded-xl text-xs font-montserrat tracking-wide flex items-center gap-1.5 cursor-pointer"
                          style={{ border: "1px solid hsl(45 60% 40% / 0.3)", color: "hsl(45 70% 65%)" }}>
                          <Icon name="Edit" size={11} /> Редактировать
                        </button>
                        <button onClick={e => { e.stopPropagation(); setInviteModal(p.id); }}
                          className="px-3 py-1.5 rounded-xl text-xs font-montserrat tracking-wide flex items-center gap-1.5 cursor-pointer"
                          style={{ border: "1px solid hsl(260 50% 40% / 0.3)", color: "hsl(260 60% 75%)" }}>
                          <Icon name="Send" size={11} /> Пригласить
                        </button>
                        <button className="px-3 py-1.5 rounded-xl text-xs font-montserrat tracking-wide flex items-center gap-1.5 cursor-pointer"
                          style={{ border: "1px solid hsl(230 40% 40% / 0.3)", color: "hsl(230 60% 75%)" }}>
                          <Icon name="MessageSquare" size={11} /> Написать
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACHIEVEMENTS */}
          {view === "achievements" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init">
              <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>
                {role === "owner" ? "Таблица достижений" : "Мой прогресс"}
              </h1>
              {role === "owner" && (
                <div className="card-mystic rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
                    <div className="grid grid-cols-5 text-xs font-montserrat tracking-widest uppercase text-muted-foreground gap-4">
                      <span className="col-span-2">Участник</span><span>Путь</span><span className="text-center">Ур.</span><span className="text-right">Дата</span>
                    </div>
                  </div>
                  {ACHIEVEMENTS.map((a, i) => (
                    <div key={i} className={`px-5 py-4 border-b last:border-0 animate-fade-in-up opacity-0-init delay-${(i + 1) * 100}`}
                      style={{ borderColor: "hsl(45 60% 40% / 0.08)" }}>
                      <div className="grid grid-cols-5 text-sm font-montserrat gap-4 items-center">
                        <span className="col-span-2" style={{ color: "hsl(45 60% 85%)" }}>{a.participant}</span>
                        <span className="text-muted-foreground text-xs">{a.path}</span>
                        <div className="flex justify-center">
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: "hsl(45 80% 55%)", color: "hsl(240 20% 6%)" }}>{a.level}</span>
                        </div>
                        <span className="text-right text-muted-foreground text-xs">{a.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {role === "participant" && (
                <div className="space-y-4">
                  {PATHS.filter(p => !p.locked).map((path, i) => (
                    <div key={path.id} className={`card-mystic rounded-2xl p-6 animate-fade-in-up opacity-0-init delay-${(i + 1) * 100}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{path.icon}</span>
                          <h3 className="font-cormorant text-xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>{path.title}</h3>
                        </div>
                        <span className="font-cormorant text-2xl" style={{ color: "hsl(45 80% 65%)" }}>2 / {path.levels}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(240 15% 18%)" }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${(2 / path.levels) * 100}%`, background: "linear-gradient(to right, hsl(260 50% 40%), hsl(45 80% 55%))" }} />
                      </div>
                      <p className="text-xs font-montserrat text-muted-foreground mt-2">Завершено уровней: 2 из {path.levels}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INTEGRATION */}
          {view === "integration" && role === "owner" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init">
              <div className="flex items-center justify-between">
                <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>
                  Интеграция сайтов
                </h1>
                <button onClick={() => setIntegrationModal(true)}
                  className="gold-btn px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                  <Icon name="Plus" size={14} />
                  Добавить сайт
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: "questnight.ru", status: "Активен", paths: 3, key: "QN-4F2A-8B1E" },
                  { name: "dark-riddles.com", status: "Активен", paths: 2, key: "DR-9C3D-7A4F" },
                  { name: "enigma-club.ru", status: "Ожидает", paths: 0, key: "EC-2E5B-1C8D" },
                ].map((site, i) => (
                  <div key={i} className={`card-mystic rounded-2xl p-5 animate-fade-in-up opacity-0-init delay-${(i + 1) * 100}`}>
                    <div className="flex items-start justify-between mb-3">
                      <Icon name="Globe" size={20} style={{ color: "hsl(45 80% 55%)" }} />
                      <span className="text-xs px-2 py-0.5 rounded-full font-montserrat"
                        style={site.status === "Активен"
                          ? { background: "hsl(45 80% 55% / 0.15)", color: "hsl(45 80% 70%)" }
                          : { background: "hsl(240 15% 20%)", color: "hsl(240 10% 55%)" }}>
                        {site.status}
                      </span>
                    </div>
                    <h3 className="font-montserrat font-semibold text-sm mb-1" style={{ color: "hsl(45 60% 85%)" }}>{site.name}</h3>
                    <p className="text-xs font-montserrat text-muted-foreground mb-3">{site.paths} путей · {site.key}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 rounded-lg text-xs font-montserrat cursor-pointer"
                        style={{ border: "1px solid hsl(45 60% 40% / 0.3)", color: "hsl(45 70% 65%)" }}>Настройки</button>
                      <button className="flex-1 py-1.5 rounded-lg text-xs font-montserrat cursor-pointer"
                        style={{ border: "1px solid hsl(0 50% 40% / 0.3)", color: "hsl(0 60% 65%)" }}>Удалить</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card-mystic rounded-2xl p-6">
                <h3 className="font-cormorant text-xl mb-1 tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>Данные для интеграции</h3>
                <p className="text-xs font-montserrat text-muted-foreground mb-4">Скопируйте и вставьте на новый сайт-квест</p>
                <div className="rounded-xl p-4 font-montserrat text-xs leading-6"
                  style={{ background: "hsl(240 20% 4%)", color: "hsl(45 60% 70%)", border: "1px solid hsl(45 60% 40% / 0.2)" }}>
                  <div style={{ color: "hsl(260 60% 70%)" }}>{"// Данные интеграции Мастер Путей"}</div>
                  <div>NETWORK_KEY: <span style={{ color: "hsl(45 80% 65%)" }}>"MP-MASTER-A1B2-C3D4"</span></div>
                  <div>API_ENDPOINT: <span style={{ color: "hsl(45 80% 65%)" }}>"https://api.masterputhey.ru/v1"</span></div>
                  <div>STYLE_PRESET: <span style={{ color: "hsl(45 80% 65%)" }}>"mystic-dark"</span></div>
                </div>
                <button className="gold-btn px-5 py-2 rounded-xl mt-4 flex items-center gap-2 text-xs cursor-pointer">
                  <Icon name="Copy" size={13} />
                  Скопировать данные интеграции
                </button>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {view === "profile" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init max-w-2xl">
              <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>
                Личный кабинет
              </h1>
              <div className="card-mystic rounded-2xl p-6">
                <div className="flex items-center gap-5 mb-6 pb-6 border-b" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-cormorant font-bold animate-glow-pulse"
                      style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(260 50% 35%))", color: "hsl(45 90% 92%)" }}>
                      {role === "owner" ? "В" : "А"}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: "hsl(240 15% 18%)", border: "1px solid hsl(45 60% 40% / 0.3)" }}>
                      <Icon name="Camera" size={11} style={{ color: "hsl(45 70% 60%)" }} />
                    </button>
                  </div>
                  <div>
                    <h2 className="font-cormorant text-2xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>
                      {role === "owner" ? "Владелец Сети" : "Александра Волкова"}
                    </h2>
                    <p className="text-sm font-montserrat text-muted-foreground">
                      {role === "owner" ? "Администратор · Мастер Путей" : "Участник · Путь Теней, Путь Света"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Имя", value: role === "owner" ? "Владелец Сети" : "Александра Волкова", type: "text" },
                    { label: "Телефон", value: "+7 900 000-00-00", type: "tel" },
                    { label: "Почта", value: "master@questnet.ru", type: "email" },
                    { label: "ВКонтакте", value: "vk.com/master", type: "text" },
                  ].map((field, i) => (
                    <div key={i}>
                      <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-1.5">
                        {field.label}
                      </label>
                      <input type={field.type} defaultValue={field.value}
                        className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none transition-all"
                        style={{ border: "1px solid hsl(45 60% 40% / 0.2)", color: "hsl(45 60% 90%)" }}
                        onFocus={e => (e.target.style.borderColor = "hsl(45 80% 55% / 0.5)")}
                        onBlur={e => (e.target.style.borderColor = "hsl(45 60% 40% / 0.2)")} />
                    </div>
                  ))}
                  <button className="gold-btn w-full py-3 rounded-xl mt-1 cursor-pointer">
                    Сохранить изменения
                  </button>
                </div>
              </div>

              {role === "participant" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PATHS.filter(p => !p.locked).map(path => (
                    <button key={path.id} onClick={() => setView("paths")}
                      className="card-mystic rounded-2xl p-4 text-left flex items-center gap-3 cursor-pointer group">
                      <span className="text-xl">{path.icon}</span>
                      <div>
                        <p className="text-xs font-montserrat text-muted-foreground mb-0.5">Начать</p>
                        <p className="font-cormorant text-lg" style={{ color: "hsl(45 60% 85%)" }}>{path.title}</p>
                      </div>
                      <Icon name="ChevronRight" size={16} className="ml-auto" style={{ color: "hsl(45 70% 60%)" }} />
                    </button>
                  ))}
                  <button className="card-mystic rounded-2xl p-4 text-left flex items-center gap-3 cursor-pointer">
                    <span className="text-xl">💳</span>
                    <div>
                      <p className="text-xs font-montserrat text-muted-foreground mb-0.5">Управление</p>
                      <p className="font-cormorant text-lg" style={{ color: "hsl(45 60% 85%)" }}>Оплата</p>
                    </div>
                  </button>
                  <button className="card-mystic rounded-2xl p-4 text-left flex items-center gap-3 cursor-pointer">
                    <span className="text-xl">📣</span>
                    <div>
                      <p className="text-xs font-montserrat text-muted-foreground mb-0.5">Связь с владельцем</p>
                      <p className="font-cormorant text-lg" style={{ color: "hsl(45 60% 85%)" }}>Сообщить</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Integration Modal */}
      {integrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIntegrationModal(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md card-mystic rounded-2xl p-6 animate-scale-in mystic-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-2xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>Принять дополнение</h2>
              <button onClick={() => setIntegrationModal(false)} className="text-muted-foreground cursor-pointer"><Icon name="X" size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { icon: "✨", title: "Создать новый сайт", desc: "Автокопирование данных", color: "45" },
                { icon: "🔑", title: "Принять по ключу", desc: "Вставить данные вручную", color: "260" },
              ].map((opt, i) => (
                <button key={i} className="py-5 rounded-xl text-center transition-all cursor-pointer"
                  style={{ background: `hsl(${opt.color} 80% 55% / 0.1)`, border: `1px solid hsl(${opt.color} 60% 50% / 0.3)`, color: `hsl(${opt.color} 70% 70%)` }}>
                  <div className="text-2xl mb-2">{opt.icon}</div>
                  <p className="text-xs font-montserrat font-semibold tracking-wide">{opt.title}</p>
                  <p className="text-xs font-montserrat text-muted-foreground mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">Вставьте данные интеграции</label>
              <textarea rows={4} placeholder={"NETWORK_KEY: ...\nAPI_ENDPOINT: ...\nSTYLE_PRESET: ..."}
                className="w-full bg-muted/50 rounded-xl px-4 py-3 text-xs font-montserrat outline-none resize-none"
                style={{ border: "1px solid hsl(45 60% 40% / 0.2)", color: "hsl(45 60% 90%)" }} />
            </div>
            <button className="gold-btn w-full py-3 rounded-xl mt-4 flex items-center justify-center gap-2 cursor-pointer">
              <Icon name="Link" size={14} /> Подключить сайт
            </button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setInviteModal(null)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div className="relative w-full max-w-sm card-mystic rounded-2xl p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-2xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>Пригласить участника</h2>
              <button onClick={() => setInviteModal(null)} className="text-muted-foreground cursor-pointer"><Icon name="X" size={18} /></button>
            </div>
            <div className="space-y-2">
              {[
                { label: "СМС", icon: "📱" },
                { label: "ВКонтакте", icon: "💬" },
                { label: "Макс", icon: "📨" },
                { label: "Уникальная ссылка", icon: "🔗" },
              ].map((m, i) => (
                <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-montserrat transition-all text-left cursor-pointer"
                  style={{ border: "1px solid hsl(45 60% 40% / 0.2)", color: "hsl(45 60% 85%)" }}>
                  <span className="text-lg">{m.icon}</span>
                  {m.label}
                  <Icon name="ChevronRight" size={14} className="ml-auto text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
