import { Activity, CalendarDays, ClipboardList, Cloud, HeartPulse, ShieldCheck, Users } from "lucide-react";

const modules = [
  { title: "Patients", detail: "Dossiers et identité", icon: Users },
  { title: "Consultations", detail: "Soins et observations", icon: HeartPulse },
  { title: "Rendez-vous", detail: "Agenda de la clinique", icon: CalendarDays },
  { title: "Dossier médical", detail: "Historique et documents", icon: ClipboardList },
];

export default function App() {
  const supabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><HeartPulse size={22} /></span><div><strong>Gestion Médicale</strong><small>Clinique & centre médical</small></div></div>
        <nav aria-label="Navigation principale">
          <a className="active" href="#dashboard">Vue d'ensemble</a>
          {modules.map((item) => <a href="#modules" key={item.title}>{item.title}</a>)}
          <a href="#securite">Sécurité & synchronisation</a>
        </nav>
        <div className="sidebar-note"><ShieldCheck size={18}/><span>Accès sécurisé par rôle<br/>à configurer avant production</span></div>
      </aside>

      <section className="content" id="dashboard">
        <header className="topbar"><div><p className="eyebrow">ESPACE DE GESTION</p><h1>Tableau de bord</h1><p className="muted">Le socle de votre future plateforme médicale.</p></div><div className="status"><span className={supabaseConfigured ? "dot online" : "dot"} />{supabaseConfigured ? "Configuration Supabase détectée" : "Supabase à configurer"}</div></header>
        <section className="notice" id="securite"><Cloud size={22}/><div><strong>Mode hybride en préparation</strong><p>Cette version est un squelette d'interface. Aucune donnée patient n'est encore enregistrée. Le stockage local et la synchronisation doivent être développés et testés avant usage clinique.</p></div></section>
        <section className="metrics" aria-label="Indicateurs">
          <article className="metric"><span>Modules planifiés</span><strong>20+</strong><small>Selon le cahier des charges</small></article>
          <article className="metric"><span>Connexion cloud</span><strong>{supabaseConfigured ? "Configurée" : "À configurer"}</strong><small>La connexion n'est pas encore testée</small></article>
          <article className="metric"><span>État du produit</span><strong>Initial</strong><small>Pas encore pour production</small></article>
        </section>
        <section id="modules"><div className="section-heading"><div><p className="eyebrow">FONCTIONNALITÉS</p><h2>Modules principaux</h2></div><span className="pill">Architecture initiale</span></div><div className="module-grid">{modules.map(({ title, detail, icon: Icon }) => <article className="module-card" key={title}><div className="module-icon"><Icon size={22}/></div><h3>{title}</h3><p>{detail}</p><span className="planned">À développer</span></article>)}</div></section>
        <footer>Gestion Médicale · Socle initial · Ne pas utiliser avec des données réelles à ce stade.</footer>
      </section>
    </main>
  );
}
