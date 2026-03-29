import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API = {
  auth: "https://functions.poehali.dev/7c1f47ea-3a9b-402e-b878-5da553faf40f",
  messages: "https://functions.poehali.dev/0d737f65-24f9-4629-a854-fe4a2970acfa",
  invitations: "https://functions.poehali.dev/313a85df-ccc2-43d5-8e79-b1f7ae2dea36",
  sites: "https://functions.poehali.dev/86ba4940-f795-4fd2-bb7d-c023c5850678",
  users: "https://functions.poehali.dev/1d137c0c-8398-4948-8186-9aa5ec2e8aa2",
};

type View = "dashboard" | "paths" | "participants" | "achievements" | "profile" | "integration" | "chat" | "pending";
type Role = "owner" | "participant";

interface User { id: number; name: string; phone: string; role: Role; status: string; email?: string; vk?: string; }
interface Message { id: number; from_user_id: number; to_user_id: number; body: string; is_read: boolean; created_at: string; from_name: string; }
interface Inbox { other_user_id: number; other_name: string; last_message: string; last_time: string; unread_count: number; }
interface Invitation { id: number; invite_code: string; phone?: string; channel: string; used_by?: number; used_at?: string; expires_at: string; created_at: string; invite_url: string; }
interface Site { id: number; name: string; domain?: string; network_key: string; status: string; style_preset: string; auto_approve: boolean; paths_count: number; }
interface PendingUser { id: number; name: string; phone: string; created_at: string; }

const PATHS = [
  { id: 1, title: "Путь Теней", description: "Испытание для избранных. Семь уровней мрака ведут к истине.", levels: 7, locked: false, participants: 14, icon: "🌑" },
  { id: 2, title: "Путь Света", description: "Восхождение к знанию через загадки древних мудрецов.", levels: 5, locked: false, participants: 23, icon: "✨" },
  { id: 3, title: "Путь Огня", description: "Только стойкие духом пройдут сквозь пламя испытаний.", levels: 9, locked: true, participants: 7, icon: "🔥" },
  { id: 4, title: "Путь Воды", description: "Текучесть мышления — ключ к скрытым истинам бытия.", levels: 6, locked: true, participants: 0, icon: "💧" },
];

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return { border: "1px solid hsl(45 60% 40% / 0.2)", color: "hsl(45 60% 90%)", ...extra };
}

export default function Index() {
  const [view, setView] = useState<View>("dashboard");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginRole, setLoginRole] = useState<Role>("owner");
  const [loginError, setLoginError] = useState("");
  const [regMode, setRegMode] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regError, setRegError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chat
  const [inbox, setInbox] = useState<Inbox[]>([]);
  const [chatWith, setChatWith] = useState<{id: number; name: string} | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [participants, setParticipants] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [newInviteUrl, setNewInviteUrl] = useState("");
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  // Sites
  const [sites, setSites] = useState<Site[]>([]);
  const [siteModal, setSiteModal] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [siteStyle, setSiteStyle] = useState("mystic-dark");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [integrationData, setIntegrationData] = useState<{integration: Record<string,string>; ai_prompt: string} | null>(null);
  const [intDataModal, setIntDataModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);

  // Check invite code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) { setRegCode(code); setRegMode(true); }
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    try {
      const r = await fetch(`${API.auth}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: loginPhone, password: loginPass, action: "login" }) });
      const d = await r.json();
      if (!r.ok) { setLoginError(d.error || "Неверный телефон или пароль"); return; }
      setCurrentUser(d);
    } catch { setLoginError("Ошибка соединения"); }
  };

  const handleRegister = async () => {
    setRegError("");
    if (!regName || !regPhone || !regPass) { setRegError("Заполните все поля"); return; }
    try {
      const r = await fetch(`${API.auth}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: regPhone, password: regPass, name: regName, invite_code: regCode || undefined, action: "register" }) });
      const d = await r.json();
      if (!r.ok) { setRegError(d.error || "Ошибка регистрации"); return; }
      if (d.status === "pending") { setRegError("Аккаунт создан! Ожидайте одобрения владельца."); return; }
      setCurrentUser({ ...d, phone: regPhone });
    } catch { setRegError("Ошибка соединения"); }
  };

  const loadInbox = useCallback(async () => {
    if (!currentUser) return;
    const r = await fetch(`${API.messages}/?user_id=${currentUser.id}&inbox=1`);
    if (r.ok) setInbox(await r.json());
  }, [currentUser]);

  const loadMessages = useCallback(async (otherId: number) => {
    if (!currentUser) return;
    const r = await fetch(`${API.messages}/?user_id=${currentUser.id}&with=${otherId}`);
    if (r.ok) setMessages(await r.json());
  }, [currentUser]);

  const loadParticipants = useCallback(async () => {
    if (!currentUser || currentUser.role !== "owner") return;
    const r = await fetch(`${API.users}/?owner_id=${currentUser.id}`);
    if (r.ok) setParticipants(await r.json());
  }, [currentUser]);

  const loadPending = useCallback(async () => {
    if (!currentUser || currentUser.role !== "owner") return;
    const r = await fetch(`${API.users}/pending`);
    if (r.ok) setPendingUsers(await r.json());
  }, [currentUser]);

  const loadInvitations = useCallback(async () => {
    if (!currentUser) return;
    const r = await fetch(`${API.invitations}/?owner_id=${currentUser.id}`);
    if (r.ok) setInvitations(await r.json());
  }, [currentUser]);

  const loadSites = useCallback(async () => {
    if (!currentUser) return;
    const r = await fetch(`${API.sites}/?owner_id=${currentUser.id}`);
    if (r.ok) setSites(await r.json());
  }, [currentUser]);

  const loadIntegrationData = useCallback(async () => {
    if (!currentUser) return;
    const r = await fetch(`${API.sites}/integration-data?owner_id=${currentUser.id}`);
    if (r.ok) { setIntegrationData(await r.json()); setIntDataModal(true); }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (view === "chat") { loadInbox(); }
    if (view === "participants" && currentUser.role === "owner") { loadParticipants(); loadPending(); }
    if (view === "integration" && currentUser.role === "owner") { loadSites(); loadInvitations(); }
    if (view === "pending") loadPending();
  }, [view, currentUser, loadInbox, loadParticipants, loadPending, loadSites, loadInvitations]);

  useEffect(() => {
    if (chatWith) loadMessages(chatWith.id);
  }, [chatWith, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll messages
  useEffect(() => {
    if (!chatWith || !currentUser) return;
    const iv = setInterval(() => loadMessages(chatWith.id), 5000);
    return () => clearInterval(iv);
  }, [chatWith, currentUser, loadMessages]);

  const sendMessage = async () => {
    if (!msgInput.trim() || !chatWith || !currentUser) return;
    const body = msgInput;
    setMsgInput("");
    await fetch(`${API.messages}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from_user_id: currentUser.id, to_user_id: chatWith.id, body }) });
    loadMessages(chatWith.id);
    loadInbox();
  };

  const createInvite = async () => {
    if (!currentUser) return;
    const r = await fetch(`${API.invitations}/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ created_by: currentUser.id, phone: invitePhone || undefined, name: inviteName || undefined, channel: "link" }) });
    if (r.ok) {
      const d = await r.json();
      setNewInviteUrl(d.invite_url);
      loadInvitations();
    }
  };

  const createSite = async () => {
    if (!currentUser || !siteName) return;
    const r = await fetch(`${API.sites}/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner_id: currentUser.id, name: siteName, domain: siteDomain || undefined, style_preset: siteStyle }) });
    if (r.ok) { setSiteModal(false); setSiteName(""); setSiteDomain(""); loadSites(); }
  };

  const updateSite = async () => {
    if (!editSite) return;
    await fetch(`${API.sites}/?id=${editSite.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: siteName, domain: siteDomain, style_preset: siteStyle }) });
    setEditSite(null); setSiteModal(false); loadSites();
  };

  const approvePending = async (userId: number, approve: boolean) => {
    await fetch(`${API.users}/?id=${userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: approve ? "active" : "rejected" }) });
    loadPending();
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const totalUnread = inbox.reduce((s, i) => s + i.unread_count, 0);

  const navItems = currentUser?.role === "owner"
    ? [
        { id: "dashboard", label: "Панель", icon: "LayoutDashboard" },
        { id: "paths", label: "Пути", icon: "Map" },
        { id: "participants", label: "Участники", icon: "Users" },
        { id: "achievements", label: "Достижения", icon: "Trophy" },
        { id: "chat", label: "Сообщения", icon: "MessageSquare", badge: totalUnread },
        { id: "integration", label: "Интеграция", icon: "Link" },
        { id: "profile", label: "Кабинет", icon: "User" },
      ]
    : [
        { id: "dashboard", label: "Главная", icon: "Home" },
        { id: "paths", label: "Мои Пути", icon: "Map" },
        { id: "achievements", label: "Прогресс", icon: "Trophy" },
        { id: "chat", label: "Сообщения", icon: "MessageSquare", badge: totalUnread },
        { id: "profile", label: "Кабинет", icon: "User" },
      ];

  // ─── LOGIN SCREEN ───────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background bg-mystic-pattern star-field flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, hsl(260 60% 50%), transparent)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, hsl(230 60% 40%), transparent)" }} />

        <div className="relative z-10 text-center mb-10 animate-fade-in-up opacity-0-init">
          <div className="text-6xl mb-4 animate-float">⚜️</div>
          <h1 className="font-cormorant text-6xl font-light tracking-widest gold-gradient mb-2">Мастер Путей</h1>
          <p className="font-montserrat text-xs tracking-[0.3em] text-muted-foreground uppercase">Квестовая сеть</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16" style={{ background: "linear-gradient(to right, transparent, hsl(45 80% 55%))" }} />
            <span className="ornament text-xs">✦</span>
            <div className="h-px w-16" style={{ background: "linear-gradient(to left, transparent, hsl(45 80% 55%))" }} />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-sm mx-4 animate-fade-in-up opacity-0-init delay-200">
          <div className="card-mystic rounded-2xl p-8">
            {!regMode ? (
              <>
                <h2 className="font-cormorant text-2xl text-center mb-6 tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>Вход в систему</h2>
                <div className="flex rounded-xl overflow-hidden mb-6" style={{ border: "1px solid hsl(45 60% 40% / 0.3)" }}>
                  {(["owner", "participant"] as Role[]).map(r => (
                    <button key={r} onClick={() => setLoginRole(r)}
                      className="flex-1 py-2.5 text-xs font-montserrat tracking-widest uppercase transition-all cursor-pointer"
                      style={loginRole === r ? { background: "linear-gradient(135deg, hsl(45 85% 50%), hsl(38 75% 42%))", color: "hsl(240 20% 6%)", fontWeight: 600 } : { color: "hsl(240 10% 55%)" }}>
                      {r === "owner" ? "Владелец" : "Участник"}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">Телефон</label>
                    <input type="tel" placeholder="+7 900 000-00-00" value={loginPhone} onChange={e => setLoginPhone(e.target.value)}
                      className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none transition-all" style={inp()} />
                  </div>
                  <div>
                    <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">Пароль</label>
                    <input type="password" placeholder="••••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)}
                      className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none transition-all" style={inp()}
                      onKeyDown={e => e.key === "Enter" && handleLogin()} />
                  </div>
                  {loginError && <p className="text-xs font-montserrat text-center" style={{ color: "hsl(0 60% 65%)" }}>{loginError}</p>}
                  <button onClick={handleLogin} className="gold-btn w-full py-3 rounded-xl cursor-pointer">Войти в систему</button>
                </div>
                <p className="text-center text-xs font-montserrat text-muted-foreground mt-4">
                  Нет аккаунта?{" "}
                  <button onClick={() => setRegMode(true)} className="underline cursor-pointer" style={{ color: "hsl(45 70% 60%)" }}>Зарегистрироваться</button>
                </p>
              </>
            ) : (
              <>
                <h2 className="font-cormorant text-2xl text-center mb-6 tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>Регистрация</h2>
                <div className="space-y-4">
                  {[
                    { label: "Имя", value: regName, set: setRegName, type: "text", ph: "Ваше имя" },
                    { label: "Телефон", value: regPhone, set: setRegPhone, type: "tel", ph: "+7 900 000-00-00" },
                    { label: "Пароль", value: regPass, set: setRegPass, type: "password", ph: "••••••••" },
                    { label: "Код приглашения (если есть)", value: regCode, set: setRegCode, type: "text", ph: "XXXXXXXX" },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">{f.label}</label>
                      <input type={f.type} placeholder={f.ph} value={f.value} onChange={e => f.set(e.target.value)}
                        className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none" style={inp()} />
                    </div>
                  ))}
                  {regError && <p className="text-xs font-montserrat text-center" style={{ color: regError.includes("создан") ? "hsl(45 80% 65%)" : "hsl(0 60% 65%)" }}>{regError}</p>}
                  <button onClick={handleRegister} className="gold-btn w-full py-3 rounded-xl cursor-pointer">Создать аккаунт</button>
                </div>
                <p className="text-center text-xs font-montserrat text-muted-foreground mt-4">
                  <button onClick={() => setRegMode(false)} className="underline cursor-pointer" style={{ color: "hsl(45 70% 60%)" }}>← Назад ко входу</button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── APP SHELL ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "hsl(240 18% 7%)", borderRight: "1px solid hsl(45 60% 40% / 0.15)" }}>
        <div className="p-6 border-b" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚜️</span>
            <div>
              <h1 className="font-cormorant text-xl tracking-widest" style={{ color: "hsl(45 80% 70%)" }}>Мастер Путей</h1>
              <p className="text-xs font-montserrat tracking-widest text-muted-foreground uppercase">
                {currentUser.role === "owner" ? "Владелец" : "Участник"}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setView(item.id as View); setSidebarOpen(false); setChatWith(null); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-montserrat tracking-wide transition-all cursor-pointer"
              style={view === item.id ? { background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(38 70% 42%))", color: "hsl(240 20% 6%)", fontWeight: 600 } : { color: "hsl(240 10% 55%)" }}>
              <Icon name={item.icon} size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {(item.badge ?? 0) > 0 && (
                <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{ background: "hsl(45 80% 55%)", color: "hsl(240 20% 6%)" }}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
          <button onClick={() => { setCurrentUser(null); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-montserrat text-muted-foreground hover:text-foreground transition-all cursor-pointer">
            <Icon name="LogOut" size={16} /> Выйти
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="nav-glass sticky top-0 z-30 flex items-center px-6 py-4 gap-4">
          <button className="lg:hidden cursor-pointer" onClick={() => setSidebarOpen(true)}><Icon name="Menu" size={20} /></button>
          <h2 className="font-cormorant text-xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>
            {chatWith ? `Чат: ${chatWith.name}` : navItems.find(n => n.id === view)?.label}
          </h2>
          {chatWith && (
            <button onClick={() => setChatWith(null)} className="text-xs font-montserrat text-muted-foreground cursor-pointer ml-2 flex items-center gap-1">
              <Icon name="ChevronLeft" size={14} /> Назад
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(260 50% 40%))", color: "hsl(240 20% 6%)" }}>
              {currentUser.name[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* ── DASHBOARD ─────────────────────────────────────────── */}
          {view === "dashboard" && (
            <div className="space-y-8 animate-fade-in-up opacity-0-init">
              <div>
                <h1 className="font-cormorant text-4xl font-light tracking-wider mb-1" style={{ color: "hsl(45 60% 85%)" }}>
                  Добро пожаловать, {currentUser.name}
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
                  { label: "Сайтов в сети", value: String(sites.length || "—"), icon: "Globe", color: "hsl(260 60% 65%)" },
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
              {currentUser.role === "owner" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: "🔗", title: "Интеграция сайтов", desc: "Добавить или настроить сайт", action: () => setView("integration") },
                    { icon: "📨", title: "Пригласить участника", desc: "Создать ссылку-приглашение", action: () => { setView("integration"); } },
                    { icon: "💬", title: "Сообщения", desc: totalUnread > 0 ? `${totalUnread} непрочитанных` : "Написать участнику", action: () => { setView("chat"); loadInbox(); } },
                  ].map((item, i) => (
                    <button key={i} onClick={item.action} className="card-mystic rounded-2xl p-5 text-left cursor-pointer">
                      <div className="text-2xl mb-3">{item.icon}</div>
                      <p className="font-cormorant text-lg mb-1" style={{ color: "hsl(45 60% 85%)" }}>{item.title}</p>
                      <p className="text-xs font-montserrat text-muted-foreground">{item.desc}</p>
                    </button>
                  ))}
                </div>
              )}
              {currentUser.role === "participant" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PATHS.map(path => (
                    <button key={path.id} onClick={() => !path.locked && setView("paths")}
                      className={`card-mystic rounded-2xl p-5 text-left ${path.locked ? "path-locked cursor-not-allowed" : "cursor-pointer"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{path.icon}</span>
                        <Icon name={path.locked ? "Lock" : "Unlock"} size={14} style={{ color: path.locked ? "hsl(240 10% 45%)" : "hsl(45 80% 60%)" }} />
                      </div>
                      <p className="font-cormorant text-xl mb-1" style={{ color: "hsl(45 60% 85%)" }}>{path.title}</p>
                      <p className="text-xs font-montserrat text-muted-foreground">{path.levels} уровней</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PATHS ─────────────────────────────────────────────── */}
          {view === "paths" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init">
              <div className="flex items-center justify-between">
                <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>
                  {currentUser.role === "owner" ? "Управление Путями" : "Мои Пути"}
                </h1>
                {currentUser.role === "owner" && (
                  <button className="gold-btn px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                    <Icon name="Plus" size={14} /> Создать Путь
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {PATHS.map((path, i) => (
                  <div key={path.id} className={`card-mystic rounded-2xl p-6 cursor-pointer animate-fade-in-up opacity-0-init delay-${(i+1)*100} ${path.locked && currentUser.role === "participant" ? "path-locked" : ""}`}>
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-3xl">{path.icon}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full font-montserrat flex items-center gap-1.5"
                        style={path.locked ? { background: "hsl(240 15% 18%)", color: "hsl(240 10% 50%)" } : { background: "hsl(45 80% 55% / 0.15)", color: "hsl(45 80% 70%)" }}>
                        <Icon name={path.locked ? "Lock" : "Unlock"} size={11} />
                        {path.locked ? "Закрыт" : "Открыт"}
                      </span>
                    </div>
                    <h3 className="font-cormorant text-2xl font-light mb-2 tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>{path.title}</h3>
                    <p className="text-sm font-montserrat text-muted-foreground mb-4 leading-relaxed">{path.description}</p>
                    <div className="flex items-center justify-between text-xs font-montserrat text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Icon name="Layers" size={12} />{path.levels} уровней</span>
                      <span className="flex items-center gap-1.5"><Icon name="Users" size={12} />{path.participants} участников</span>
                    </div>
                    {currentUser.role === "owner" && (
                      <div className="mt-4 pt-4 flex gap-2 border-t" style={{ borderColor: "hsl(45 60% 40% / 0.2)" }}>
                        <button className="flex-1 py-2 rounded-xl text-xs font-montserrat cursor-pointer flex items-center justify-center gap-1.5"
                          style={{ border: "1px solid hsl(45 60% 40% / 0.3)", color: "hsl(45 70% 65%)" }}>
                          <Icon name="Edit" size={12} /> Редактировать
                        </button>
                        <button className="flex-1 py-2 rounded-xl text-xs font-montserrat cursor-pointer flex items-center justify-center gap-1.5"
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

          {/* ── PARTICIPANTS ──────────────────────────────────────── */}
          {view === "participants" && currentUser.role === "owner" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>Участники</h1>
                <div className="flex gap-2">
                  {pendingUsers.length > 0 && (
                    <button onClick={() => setView("pending")}
                      className="px-4 py-2.5 rounded-xl text-xs font-montserrat flex items-center gap-2 cursor-pointer"
                      style={{ background: "hsl(45 80% 55% / 0.15)", border: "1px solid hsl(45 80% 55% / 0.3)", color: "hsl(45 80% 70%)" }}>
                      <Icon name="Clock" size={13} />
                      Ожидают одобрения ({pendingUsers.length})
                    </button>
                  )}
                  <button onClick={() => setInviteModal(true)} className="gold-btn px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                    <Icon name="UserPlus" size={14} /> Пригласить
                  </button>
                </div>
              </div>

              {/* Auto-approve toggle */}
              <div className="card-mystic rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-montserrat font-semibold" style={{ color: "hsl(45 60% 85%)" }}>Одобрение участников</p>
                  <p className="text-xs font-montserrat text-muted-foreground mt-0.5">
                    {autoApprove ? "Автоматически — все принимаются сразу" : "Вручную — вы одобряете каждого"}
                  </p>
                </div>
                <button onClick={() => setAutoApprove(!autoApprove)}
                  className="relative w-12 h-6 rounded-full transition-all cursor-pointer flex-shrink-0"
                  style={{ background: autoApprove ? "hsl(45 80% 50%)" : "hsl(240 15% 25%)" }}>
                  <div className="absolute top-1 w-4 h-4 rounded-full transition-all"
                    style={{ background: "white", left: autoApprove ? "28px" : "4px" }} />
                </button>
              </div>

              <div className="space-y-3">
                {participants.length === 0 && (
                  <div className="card-mystic rounded-2xl p-8 text-center">
                    <p className="font-cormorant text-xl text-muted-foreground">Участников пока нет</p>
                    <p className="text-xs font-montserrat text-muted-foreground mt-2">Создайте приглашение и поделитесь ссылкой</p>
                  </div>
                )}
                {participants.map((p, i) => (
                  <div key={p.id} className={`card-mystic rounded-2xl p-5 animate-fade-in-up opacity-0-init delay-${(i+1)*100}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center font-cormorant text-xl font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(260 50% 40%))", color: "hsl(45 90% 92%)" }}>
                        {p.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-montserrat font-semibold text-sm truncate" style={{ color: "hsl(45 60% 85%)" }}>{p.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-montserrat flex-shrink-0"
                            style={{ background: p.status === "active" ? "hsl(45 80% 55% / 0.15)" : "hsl(0 50% 40% / 0.2)", color: p.status === "active" ? "hsl(45 80% 70%)" : "hsl(0 60% 65%)" }}>
                            {p.status === "active" ? "Активен" : "Ожидает"}
                          </span>
                        </div>
                        <p className="text-xs font-montserrat text-muted-foreground">{p.phone}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => { setChatWith({ id: p.id, name: p.name }); setView("chat"); }}
                          className="px-3 py-1.5 rounded-xl text-xs font-montserrat cursor-pointer flex items-center gap-1.5"
                          style={{ border: "1px solid hsl(260 50% 40% / 0.3)", color: "hsl(260 60% 75%)" }}>
                          <Icon name="MessageSquare" size={11} /> Написать
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PENDING USERS ─────────────────────────────────────── */}
          {view === "pending" && currentUser.role === "owner" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("participants")} className="text-muted-foreground cursor-pointer">
                  <Icon name="ChevronLeft" size={20} />
                </button>
                <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>Ожидают одобрения</h1>
              </div>
              {pendingUsers.length === 0 ? (
                <div className="card-mystic rounded-2xl p-10 text-center">
                  <p className="font-cormorant text-2xl" style={{ color: "hsl(45 60% 70%)" }}>Нет новых заявок</p>
                </div>
              ) : pendingUsers.map((u, i) => (
                <div key={u.id} className={`card-mystic rounded-2xl p-5 animate-fade-in-up opacity-0-init delay-${(i+1)*100}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-cormorant text-xl font-bold"
                      style={{ background: "hsl(240 15% 22%)", color: "hsl(45 60% 70%)" }}>{u.name[0]}</div>
                    <div className="flex-1">
                      <p className="font-montserrat font-semibold text-sm" style={{ color: "hsl(45 60% 85%)" }}>{u.name}</p>
                      <p className="text-xs font-montserrat text-muted-foreground">{u.phone} · {new Date(u.created_at).toLocaleDateString("ru-RU")}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => approvePending(u.id, true)}
                        className="px-4 py-2 rounded-xl text-xs font-montserrat cursor-pointer"
                        style={{ background: "hsl(45 80% 55% / 0.15)", border: "1px solid hsl(45 80% 55% / 0.4)", color: "hsl(45 80% 70%)" }}>
                        ✓ Принять
                      </button>
                      <button onClick={() => approvePending(u.id, false)}
                        className="px-4 py-2 rounded-xl text-xs font-montserrat cursor-pointer"
                        style={{ border: "1px solid hsl(0 50% 40% / 0.3)", color: "hsl(0 60% 65%)" }}>
                        ✕ Отклонить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ACHIEVEMENTS ──────────────────────────────────────── */}
          {view === "achievements" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init">
              <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>
                {currentUser.role === "owner" ? "Таблица достижений" : "Мой прогресс"}
              </h1>
              <div className="card-mystic rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
                  <div className="grid grid-cols-5 text-xs font-montserrat tracking-widest uppercase text-muted-foreground gap-4">
                    <span className="col-span-2">Участник</span><span>Путь</span><span className="text-center">Ур.</span><span className="text-right">Дата</span>
                  </div>
                </div>
                {[
                  { participant: "Елена Звёздная", path: "Путь Теней", level: 7, date: "28.03.2026" },
                  { participant: "Ольга Лунная", path: "Путь Света", level: 5, date: "27.03.2026" },
                  { participant: "Александра Волкова", path: "Путь Теней", level: 6, date: "27.03.2026" },
                ].map((a, i) => (
                  <div key={i} className="px-5 py-4 border-b last:border-0" style={{ borderColor: "hsl(45 60% 40% / 0.08)" }}>
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
            </div>
          )}

          {/* ── CHAT ──────────────────────────────────────────────── */}
          {view === "chat" && (
            <div className="animate-fade-in-up opacity-0-init h-full">
              {!chatWith ? (
                <div className="space-y-4">
                  <h1 className="font-cormorant text-4xl font-light tracking-wider mb-6" style={{ color: "hsl(45 60% 85%)" }}>Сообщения</h1>

                  {/* Owner: показываем всех участников */}
                  {currentUser.role === "owner" && participants.length === 0 && (
                    <button onClick={loadParticipants} className="gold-btn px-4 py-2 rounded-xl text-xs cursor-pointer">Загрузить участников</button>
                  )}
                  {currentUser.role === "owner" && participants.map((p) => {
                    const dialog = inbox.find(i => i.other_user_id === p.id);
                    return (
                      <div key={p.id} onClick={() => { setChatWith({ id: p.id, name: p.name }); loadMessages(p.id); }}
                        className="card-mystic rounded-2xl p-4 cursor-pointer flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-cormorant text-lg font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(260 50% 40%))", color: "hsl(45 90% 92%)" }}>
                          {p.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-montserrat font-semibold text-sm truncate" style={{ color: "hsl(45 60% 85%)" }}>{p.name}</p>
                          {dialog && <p className="text-xs font-montserrat text-muted-foreground truncate mt-0.5">{dialog.last_message}</p>}
                        </div>
                        {(dialog?.unread_count ?? 0) > 0 && (
                          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0"
                            style={{ background: "hsl(45 80% 55%)", color: "hsl(240 20% 6%)" }}>{dialog!.unread_count}</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Participant: только владелец */}
                  {currentUser.role === "participant" && (
                    <div onClick={() => { setChatWith({ id: 1, name: "Владелец" }); loadMessages(1); }}
                      className="card-mystic rounded-2xl p-4 cursor-pointer flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-cormorant text-lg font-bold"
                        style={{ background: "linear-gradient(135deg, hsl(45 80% 50%), hsl(260 50% 40%))", color: "hsl(45 90% 92%)" }}>В</div>
                      <div className="flex-1">
                        <p className="font-montserrat font-semibold text-sm" style={{ color: "hsl(45 60% 85%)" }}>Владелец</p>
                        <p className="text-xs font-montserrat text-muted-foreground">Администратор платформы</p>
                      </div>
                      {(inbox[0]?.unread_count ?? 0) > 0 && (
                        <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                          style={{ background: "hsl(45 80% 55%)", color: "hsl(240 20% 6%)" }}>{inbox[0].unread_count}</span>
                      )}
                    </div>
                  )}

                  {inbox.length === 0 && currentUser.role === "owner" && participants.length > 0 && (
                    <p className="text-xs font-montserrat text-muted-foreground text-center py-4">Нажмите на участника, чтобы начать переписку</p>
                  )}
                </div>
              ) : (
                /* ── CHAT WINDOW ── */
                <div className="flex flex-col h-[calc(100vh-140px)]">
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                    {messages.length === 0 && (
                      <div className="text-center py-10">
                        <p className="font-cormorant text-xl text-muted-foreground">Начните переписку</p>
                      </div>
                    )}
                    {messages.map((m) => {
                      const isMine = m.from_user_id === currentUser.id;
                      return (
                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[70%] px-4 py-3 rounded-2xl"
                            style={isMine
                              ? { background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(38 70% 38%))", color: "hsl(240 20% 6%)" }
                              : { background: "hsl(240 18% 12%)", border: "1px solid hsl(45 60% 40% / 0.2)", color: "hsl(45 40% 85%)" }}>
                            {!isMine && <p className="text-xs font-montserrat font-semibold mb-1" style={{ color: "hsl(45 80% 65%)" }}>{m.from_name}</p>}
                            <p className="text-sm font-montserrat leading-relaxed">{m.body}</p>
                            <p className={`text-xs mt-1 font-montserrat ${isMine ? "text-right opacity-70" : "opacity-50"}`}>
                              {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
                    <input type="text" placeholder="Написать сообщение..." value={msgInput} onChange={e => setMsgInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none"
                      style={inp()} />
                    <button onClick={sendMessage} className="gold-btn px-5 py-3 rounded-xl cursor-pointer flex items-center gap-2">
                      <Icon name="Send" size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── INTEGRATION ───────────────────────────────────────── */}
          {view === "integration" && currentUser.role === "owner" && (
            <div className="space-y-8 animate-fade-in-up opacity-0-init">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>Интеграция</h1>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={loadIntegrationData}
                    className="px-4 py-2.5 rounded-xl text-xs font-montserrat flex items-center gap-2 cursor-pointer"
                    style={{ border: "1px solid hsl(260 50% 40% / 0.4)", color: "hsl(260 60% 75%)" }}>
                    <Icon name="Sparkles" size={13} /> Данные для ИИ
                  </button>
                  <button onClick={() => { setSiteModal(true); setEditSite(null); setSiteName(""); setSiteDomain(""); setSiteStyle("mystic-dark"); }}
                    className="gold-btn px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer">
                    <Icon name="Plus" size={14} /> Добавить сайт
                  </button>
                </div>
              </div>

              {/* Sites list */}
              <div>
                <h2 className="font-cormorant text-2xl mb-4 tracking-wide" style={{ color: "hsl(45 60% 80%)" }}>Сайты в сети</h2>
                {sites.length === 0 && (
                  <div className="card-mystic rounded-2xl p-8 text-center">
                    <p className="font-cormorant text-xl text-muted-foreground">Сайтов пока нет</p>
                    <p className="text-xs font-montserrat text-muted-foreground mt-2">Нажмите «Добавить сайт» чтобы начать</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sites.map((site, i) => (
                    <div key={site.id} className={`card-mystic rounded-2xl p-5 animate-fade-in-up opacity-0-init delay-${(i+1)*100}`}>
                      <div className="flex items-start justify-between mb-3">
                        <Icon name="Globe" size={20} style={{ color: "hsl(45 80% 55%)" }} />
                        <span className="text-xs px-2 py-0.5 rounded-full font-montserrat"
                          style={site.status === "active" ? { background: "hsl(45 80% 55% / 0.15)", color: "hsl(45 80% 70%)" } : { background: "hsl(240 15% 20%)", color: "hsl(240 10% 55%)" }}>
                          {site.status === "active" ? "Активен" : "Ожидает"}
                        </span>
                      </div>
                      <h3 className="font-montserrat font-semibold text-sm mb-1" style={{ color: "hsl(45 60% 85%)" }}>{site.name}</h3>
                      {site.domain && <p className="text-xs font-montserrat text-muted-foreground mb-1">{site.domain}</p>}
                      <p className="text-xs font-montserrat text-muted-foreground mb-3">{site.paths_count} путей · {site.network_key}</p>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditSite(site); setSiteName(site.name); setSiteDomain(site.domain || ""); setSiteStyle(site.style_preset); setSiteModal(true); }}
                          className="flex-1 py-1.5 rounded-lg text-xs font-montserrat cursor-pointer"
                          style={{ border: "1px solid hsl(45 60% 40% / 0.3)", color: "hsl(45 70% 65%)" }}>Настройки</button>
                        <button onClick={() => setDeleteConfirm(site.id)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-montserrat cursor-pointer"
                          style={{ border: "1px solid hsl(0 50% 40% / 0.3)", color: "hsl(0 60% 65%)" }}>Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invitations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-cormorant text-2xl tracking-wide" style={{ color: "hsl(45 60% 80%)" }}>Приглашения</h2>
                  <button onClick={() => { setInviteModal(true); setInviteName(""); setInvitePhone(""); setNewInviteUrl(""); }}
                    className="gold-btn px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer">
                    <Icon name="UserPlus" size={13} /> Создать
                  </button>
                </div>
                {invitations.length === 0 && (
                  <div className="card-mystic rounded-2xl p-6 text-center">
                    <p className="text-sm font-montserrat text-muted-foreground">Нет приглашений. Создайте первое!</p>
                  </div>
                )}
                <div className="space-y-2">
                  {invitations.map((inv, i) => (
                    <div key={inv.id} className={`card-mystic rounded-xl p-4 flex items-center gap-4 animate-fade-in-up opacity-0-init delay-${(i+1)*100}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-montserrat font-semibold text-sm" style={{ color: "hsl(45 60% 85%)" }}>{inv.invite_code}</span>
                          {inv.phone && <span className="text-xs text-muted-foreground font-montserrat">{inv.phone}</span>}
                          <span className="text-xs px-2 py-0.5 rounded-full font-montserrat"
                            style={inv.used_by ? { background: "hsl(45 80% 55% / 0.15)", color: "hsl(45 80% 70%)" } : { background: "hsl(240 15% 20%)", color: "hsl(240 10% 55%)" }}>
                            {inv.used_by ? "Использовано" : "Активно"}
                          </span>
                        </div>
                        <p className="text-xs font-montserrat text-muted-foreground truncate">{inv.invite_url}</p>
                      </div>
                      <button onClick={() => { copyText(inv.invite_url, `inv-${inv.id}`); setCopiedInvite(`inv-${inv.id}`); setTimeout(() => setCopiedInvite(null), 2000); }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-montserrat cursor-pointer flex items-center gap-1.5"
                        style={{ border: "1px solid hsl(45 60% 40% / 0.3)", color: copiedInvite === `inv-${inv.id}` ? "hsl(45 80% 70%)" : "hsl(45 60% 55%)" }}>
                        <Icon name={copiedInvite === `inv-${inv.id}` ? "Check" : "Copy"} size={12} />
                        {copiedInvite === `inv-${inv.id}` ? "Скопировано" : "Копировать"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE ───────────────────────────────────────────── */}
          {view === "profile" && (
            <div className="space-y-6 animate-fade-in-up opacity-0-init max-w-2xl">
              <h1 className="font-cormorant text-4xl font-light tracking-wider" style={{ color: "hsl(45 60% 85%)" }}>Личный кабинет</h1>
              <div className="card-mystic rounded-2xl p-6">
                <div className="flex items-center gap-5 mb-6 pb-6 border-b" style={{ borderColor: "hsl(45 60% 40% / 0.15)" }}>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-cormorant font-bold animate-glow-pulse"
                      style={{ background: "linear-gradient(135deg, hsl(45 80% 45%), hsl(260 50% 35%))", color: "hsl(45 90% 92%)" }}>
                      {currentUser.name[0]}
                    </div>
                  </div>
                  <div>
                    <h2 className="font-cormorant text-2xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>{currentUser.name}</h2>
                    <p className="text-sm font-montserrat text-muted-foreground">
                      {currentUser.role === "owner" ? "Администратор · Мастер Путей" : "Участник"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Имя", value: currentUser.name, type: "text" },
                    { label: "Телефон", value: currentUser.phone, type: "tel" },
                    { label: "Почта", value: currentUser.email || "", type: "email" },
                    { label: "ВКонтакте", value: currentUser.vk || "", type: "text" },
                  ].map((field, i) => (
                    <div key={i}>
                      <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-1.5">{field.label}</label>
                      <input type={field.type} defaultValue={field.value}
                        className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none transition-all" style={inp()} />
                    </div>
                  ))}
                  <button className="gold-btn w-full py-3 rounded-xl cursor-pointer">Сохранить изменения</button>
                </div>
              </div>

              {/* Participant: invite friend + contact owner */}
              {currentUser.role === "participant" && (
                <div className="space-y-4">
                  <div className="card-mystic rounded-2xl p-5">
                    <h3 className="font-cormorant text-xl mb-3 tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>Пригласить друга</h3>
                    <p className="text-xs font-montserrat text-muted-foreground mb-4">Поделитесь ссылкой — друг зарегистрируется на платформе</p>
                    <div className="flex gap-2">
                      <input readOnly value={`${window.location.origin}?code=SHARE${currentUser.id}`}
                        className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 text-xs font-montserrat outline-none" style={inp()} />
                      <button onClick={() => copyText(`${window.location.origin}?code=SHARE${currentUser.id}`, "sharelink")}
                        className="gold-btn px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 text-xs">
                        <Icon name={copiedKey === "sharelink" ? "Check" : "Copy"} size={13} />
                        {copiedKey === "sharelink" ? "Скопировано!" : "Копировать"}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => { setView("chat"); }}
                    className="card-mystic rounded-2xl p-4 w-full text-left flex items-center gap-3 cursor-pointer">
                    <span className="text-xl">📣</span>
                    <div>
                      <p className="text-xs font-montserrat text-muted-foreground mb-0.5">Связь с владельцем</p>
                      <p className="font-cormorant text-lg" style={{ color: "hsl(45 60% 85%)" }}>Написать сообщение</p>
                    </div>
                    <Icon name="ChevronRight" size={16} className="ml-auto" style={{ color: "hsl(45 70% 60%)" }} />
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL: Создать / Редактировать сайт ─────────────────────── */}
      {siteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSiteModal(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md card-mystic rounded-2xl p-6 animate-scale-in mystic-glow" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-2xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>
                {editSite ? "Настройки сайта" : "Добавить сайт"}
              </h2>
              <button onClick={() => setSiteModal(false)} className="text-muted-foreground cursor-pointer"><Icon name="X" size={18} /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Название сайта", val: siteName, set: setSiteName, ph: "Quest Night", type: "text" },
                { label: "Домен (опционально)", val: siteDomain, set: setSiteDomain, ph: "questnight.ru", type: "text" },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">{f.label}</label>
                  <input type={f.type} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                    className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none" style={inp()} />
                </div>
              ))}
              <div>
                <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">Стиль оформления</label>
                <select value={siteStyle} onChange={e => setSiteStyle(e.target.value)}
                  className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none cursor-pointer"
                  style={inp()}>
                  <option value="mystic-dark">Мистика (тёмная)</option>
                  <option value="classic-dark">Классика (тёмная)</option>
                  <option value="fantasy-light">Фэнтези (светлая)</option>
                </select>
              </div>
            </div>
            <button onClick={editSite ? updateSite : createSite}
              className="gold-btn w-full py-3 rounded-xl mt-5 flex items-center justify-center gap-2 cursor-pointer">
              <Icon name={editSite ? "Save" : "Plus"} size={14} />
              {editSite ? "Сохранить изменения" : "Создать сайт"}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: Удаление сайта ────────────────────────────────────── */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div className="relative w-full max-w-sm card-mystic rounded-2xl p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">⚠️</div>
              <h2 className="font-cormorant text-2xl tracking-wide mb-2" style={{ color: "hsl(45 60% 85%)" }}>Удалить сайт?</h2>
              <p className="text-sm font-montserrat text-muted-foreground">Это действие нельзя отменить. Все данные интеграции будут удалены.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl text-sm font-montserrat cursor-pointer"
                style={{ border: "1px solid hsl(45 60% 40% / 0.3)", color: "hsl(45 60% 75%)" }}>Отмена</button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl text-sm font-montserrat cursor-pointer"
                style={{ background: "hsl(0 60% 35%)", color: "hsl(0 0% 95%)", border: "1px solid hsl(0 50% 45% / 0.4)" }}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Создать приглашение ───────────────────────────────── */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setInviteModal(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div className="relative w-full max-w-sm card-mystic rounded-2xl p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-2xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>Пригласить участника</h2>
              <button onClick={() => setInviteModal(false)} className="text-muted-foreground cursor-pointer"><Icon name="X" size={18} /></button>
            </div>
            {!newInviteUrl ? (
              <>
                <div className="space-y-4">
                  {[
                    { label: "Имя участника", val: inviteName, set: setInviteName, ph: "Иван Иванов", type: "text" },
                    { label: "Телефон (опционально)", val: invitePhone, set: setInvitePhone, ph: "+7 900 000-00-00", type: "tel" },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground block mb-2">{f.label}</label>
                      <input type={f.type} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                        className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm font-montserrat outline-none" style={inp()} />
                    </div>
                  ))}
                </div>
                <button onClick={createInvite} className="gold-btn w-full py-3 rounded-xl mt-5 flex items-center justify-center gap-2 cursor-pointer">
                  <Icon name="Link" size={14} /> Создать ссылку
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="text-3xl mb-3">🔗</div>
                <p className="font-cormorant text-xl mb-4" style={{ color: "hsl(45 60% 85%)" }}>Ссылка создана!</p>
                <div className="rounded-xl p-3 mb-4 text-xs font-montserrat break-all"
                  style={{ background: "hsl(240 20% 5%)", color: "hsl(45 60% 75%)", border: "1px solid hsl(45 60% 40% / 0.2)" }}>
                  {newInviteUrl}
                </div>
                <button onClick={() => { copyText(newInviteUrl, "newinvite"); }}
                  className="gold-btn w-full py-3 rounded-xl cursor-pointer flex items-center justify-center gap-2">
                  <Icon name={copiedKey === "newinvite" ? "Check" : "Copy"} size={14} />
                  {copiedKey === "newinvite" ? "Скопировано!" : "Скопировать ссылку"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Данные для ИИ ────────────────────────────────────── */}
      {intDataModal && integrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIntDataModal(false)}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
          <div className="relative w-full max-w-lg card-mystic rounded-2xl p-6 animate-scale-in mystic-glow max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cormorant text-2xl tracking-wide" style={{ color: "hsl(45 60% 85%)" }}>Данные для интеграции</h2>
              <button onClick={() => setIntDataModal(false)} className="text-muted-foreground cursor-pointer"><Icon name="X" size={18} /></button>
            </div>

            {/* Integration data block */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground">Данные сайта</p>
                <button onClick={() => copyText(JSON.stringify(integrationData.integration, null, 2), "intblock")}
                  className="text-xs font-montserrat cursor-pointer flex items-center gap-1.5"
                  style={{ color: copiedKey === "intblock" ? "hsl(45 80% 70%)" : "hsl(45 60% 55%)" }}>
                  <Icon name={copiedKey === "intblock" ? "Check" : "Copy"} size={12} />
                  {copiedKey === "intblock" ? "Скопировано" : "Копировать"}
                </button>
              </div>
              <div className="rounded-xl p-4 text-xs font-montserrat leading-6 whitespace-pre-wrap break-all"
                style={{ background: "hsl(240 20% 4%)", color: "hsl(45 60% 70%)", border: "1px solid hsl(45 60% 40% / 0.2)" }}>
                {JSON.stringify(integrationData.integration, null, 2)}
              </div>
            </div>

            {/* AI Prompt block */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-montserrat tracking-widest uppercase text-muted-foreground">Промпт для ИИ</p>
                <button onClick={() => copyText(integrationData.ai_prompt, "aiprompt")}
                  className="text-xs font-montserrat cursor-pointer flex items-center gap-1.5"
                  style={{ color: copiedKey === "aiprompt" ? "hsl(45 80% 70%)" : "hsl(45 60% 55%)" }}>
                  <Icon name={copiedKey === "aiprompt" ? "Check" : "Copy"} size={12} />
                  {copiedKey === "aiprompt" ? "Скопировано" : "Копировать промпт"}
                </button>
              </div>
              <div className="rounded-xl p-4 text-xs font-montserrat leading-relaxed"
                style={{ background: "hsl(260 25% 7%)", color: "hsl(260 40% 80%)", border: "1px solid hsl(260 50% 35% / 0.3)" }}>
                {integrationData.ai_prompt}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
