import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  CalendarDays, ClipboardList, Cloud, HeartPulse, LogOut,
  ShieldCheck, Users, Wifi, WifiOff
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./services/supabase/client";

const modules = [
  { title: "Patients", detail: "Dossiers et identité", icon: Users },
  { title: "Consultations", detail: "Soins et observations", icon: HeartPulse },
  { title: "Rendez-vous", detail: "Agenda de la clinique", icon: CalendarDays },
  { title: "Dossier médical", detail: "Historique et documents", icon: ClipboardList },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    if (!supabase) {
      setAuthReady(true);
      return () => {
        window.removeEventListener("online", onlineHandler);
        window.removeEventListener("offline", offlineHandler);
      };
    }

    let alive = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError("Impossible de vérifier la session. Réessayez.");
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError("Connexion refusée. Vérifiez vos identifiants et la configuration Auth.");
    setBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError("La déconnexion n'a pas pu être confirmée.");
  }

  if (isSupabaseConfigured && !authReady) {
    return <main className="auth-screen"><div className="auth-card"><HeartPulse size={34}/><h1>Gestion Médicale</h1><p>Vérification de la session…</p></div></main>;
  }

  if (isSupabaseConfigured && !session) {
    return (
      <main className="auth-screen">
        <form className="auth-card" onSubmit={signIn}>
          <div className="brand-mark auth-mark"><HeartPulse size={24}/></div>
          <p className="eyebrow">ESPACE SÉCURISÉ</p>
          <h1>Gestion Médicale</h1>
          <p className="muted">Connectez-vous avec votre compte clinique.</p>
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password">Mot de passe</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
          <small>Les comptes doivent être créés et autorisés dans Supabase Auth. Aucun compte n'est créé automatiquement.</small>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><HeartPulse size={22} /></span><div><strong>Gestion Médicale</strong><small>Clinique & centre médical</small></div></div>
        <nav aria-label="Navigation principale">
          <a className="active" href="#dashboard">Vue d'ensemble</a>
          {modules.map((item) => <a href="#modules" key={item.title}>{item.title}</a>)}
          <a href="#securite">Sécurité & synchronisation</a>
        </nav>
        <div className="sidebar-note"><ShieldCheck size={18}/><span>Accès sécurisé par rôle<br/>à finaliser avant production</span></div>
      </aside>

      <section className="content" id="dashboard">
        <header className="topbar">
          <div><p className="eyebrow">ESPACE DE GESTION</p><h1>Tableau de bord</h1><p className="muted">Le socle de votre future plateforme médicale.</p></div>
          <div className="header-actions">
            <div className="status">{online ? <Wifi size={15}/> : <WifiOff size={15}/>} {online ? "Réseau disponible" : "Hors ligne"}</div>
            {session && <button className="secondary-button" onClick={signOut}><LogOut size={15}/> Déconnexion</button>}
          </div>
        </header>
        {!online && <section className="notice warning"><WifiOff size={22}/><div><strong>Connexion Internet indisponible</strong><p>Ce prototype n'enregistre pas encore les opérations hors ligne. Ne saisissez pas de données médicales réelles.</p></div></section>}
        <section className="notice" id="securite"><Cloud size={22}/><div><strong>{isSupabaseConfigured ? "Session Supabase active" : "Supabase à configurer"}</strong><p>{isSupabaseConfigured ? "Authentification activée. Les modules métier, les adhésions et les permissions doivent encore être intégrés et testés." : "Ajoutez les variables d'environnement Supabase pour activer l'écran de connexion. Aucune donnée patient n'est enregistrée dans cette version."}</p></div></section>
        <section className="metrics" aria-label="Indicateurs">
          <article className="metric"><span>Modules planifiés</span><strong>20+</strong><small>Selon le cahier des charges</small></article>
          <article className="metric"><span>Connexion cloud</span><strong>{isSupabaseConfigured ? "Connecteur prêt" : "À configurer"}</strong><small>Les requêtes métier ne sont pas encore intégrées</small></article>
          <article className="metric"><span>État du produit</span><strong>Initial</strong><small>Pas encore pour production</small></article>
        </section>
        <section id="modules"><div className="section-heading"><div><p className="eyebrow">FONCTIONNALITÉS</p><h2>Modules principaux</h2></div><span className="pill">À développer</span></div><div className="module-grid">{modules.map(({ title, detail, icon: Icon }) => <article className="module-card" key={title}><div className="module-icon"><Icon size={22}/></div><h3>{title}</h3><p>{detail}</p><span className="planned">À développer</span></article>)}</div></section>
        <footer>Gestion Médicale · Socle initial · Ne pas utiliser avec des données réelles à ce stade.</footer>
      </section>
    </main>
  );
}
