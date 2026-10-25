import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity, CalendarDays, Check, ChevronDown, Cloud, FilePlus2,
  HeartPulse, LayoutDashboard, LogOut, Plus, Search, ShieldCheck, Users,
  Wifi, WifiOff, X
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./services/supabase/client";

type ModuleKey = "dashboard" | "patients" | "appointments" | "consultations";

type Establishment = {
  id: string;
  name: string;
  currency_code: string;
};

type Patient = {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  sex_at_birth: "female" | "male" | "intersex" | "unknown" | null;
  phone: string | null;
  email: string | null;
  status: "active" | "archived";
  created_at: string;
};

const navigation: { key: ModuleKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { key: "patients", label: "Patients", icon: Users },
  { key: "appointments", label: "Rendez-vous", icon: CalendarDays },
  { key: "consultations", label: "Consultations", icon: HeartPulse },
];

const emptyPatient = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  sex_at_birth: "unknown" as "female" | "male" | "intersex" | "unknown",
  phone: "",
  email: "",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value + (value.length === 10 ? "T12:00:00" : ""));
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR").format(date);
}

function patientInitials(patient: Pick<Patient, "first_name" | "last_name">) {
  return (patient.first_name.charAt(0) + patient.last_name.charAt(0)).toUpperCase();
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [activeEstablishmentId, setActiveEstablishmentId] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState("");
  const [search, setSearch] = useState("");
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientFormError, setPatientFormError] = useState("");
  const [patientForm, setPatientForm] = useState(emptyPatient);
  const [successMessage, setSuccessMessage] = useState("");

  const activeEstablishment = establishments.find((item) => item.id === activeEstablishmentId) ?? null;
  const filteredPatients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    if (!query) return patients;
    return patients.filter((patient) =>
      [patient.patient_number, patient.first_name, patient.last_name, patient.phone ?? "", patient.email ?? ""]
        .some((value) => value.toLocaleLowerCase("fr").includes(query))
    );
  }, [patients, search]);

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

  useEffect(() => {
    let alive = true;
    async function loadEstablishments() {
      if (!supabase || !session) {
        setEstablishments([]);
        setActiveEstablishmentId("");
        return;
      }
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select("establishment_id, role, status")
        .eq("user_id", session.user.id)
        .eq("status", "active");

      if (!alive) return;
      if (membershipError) {
        setPatientsError("Impossible de charger vos établissements. Vérifiez les migrations et les permissions Supabase.");
        return;
      }
      const ids = [...new Set((memberships ?? []).map((item) => item.establishment_id as string))];
      if (ids.length === 0) {
        setEstablishments([]);
        setActiveEstablishmentId("");
        setPatientsError("Votre compte est connecté, mais aucune adhésion active à un établissement ne lui est attribuée. Un administrateur doit vous donner un accès.");
        return;
      }
      const { data, error: establishmentError } = await supabase
        .from("establishments")
        .select("id, name, currency_code")
        .in("id", ids)
        .eq("is_active", true)
        .order("name");
      if (!alive) return;
      if (establishmentError) {
        setPatientsError("Impossible de charger les établissements autorisés.");
        return;
      }
      const list = (data ?? []) as Establishment[];
      setEstablishments(list);
      setActiveEstablishmentId((current) => list.some((item) => item.id === current) ? current : (list[0]?.id ?? ""));
      if (list.length === 0) setPatientsError("Aucun établissement actif n'est accessible à ce compte.");
      else setPatientsError("");
    }
    void loadEstablishments();
    return () => { alive = false; };
  }, [session]);

  useEffect(() => {
    let alive = true;
    async function loadPatients() {
      if (!supabase || !session || !activeEstablishmentId) {
        setPatients([]);
        return;
      }
      setPatientsLoading(true);
      setPatientsError("");
      const { data, error: queryError } = await supabase
        .from("patients")
        .select("id, patient_number, first_name, last_name, date_of_birth, sex_at_birth, phone, email, status, created_at")
        .eq("establishment_id", activeEstablishmentId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!alive) return;
      if (queryError) {
        setPatientsError("Impossible de charger les patients. Vérifiez les politiques RLS et les migrations Supabase.");
        setPatients([]);
      } else {
        setPatients((data ?? []) as Patient[]);
      }
      setPatientsLoading(false);
    }
    void loadPatients();
    return () => { alive = false; };
  }, [session, activeEstablishmentId]);

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
    else {
      setEstablishments([]);
      setPatients([]);
      setActiveModule("dashboard");
    }
  }

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session || !activeEstablishment) {
      setPatientFormError("Connectez-vous à Supabase et sélectionnez un établissement autorisé.");
      return;
    }
    if (!patientForm.first_name.trim() || !patientForm.last_name.trim()) {
      setPatientFormError("Le prénom et le nom sont obligatoires.");
      return;
    }
    setSavingPatient(true);
    setPatientFormError("");
    setSuccessMessage("");
    const patientNumber = "PAT-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const { error: insertError } = await supabase.from("patients").insert({
      establishment_id: activeEstablishment.id,
      patient_number: patientNumber,
      first_name: patientForm.first_name.trim(),
      last_name: patientForm.last_name.trim(),
      date_of_birth: patientForm.date_of_birth || null,
      sex_at_birth: patientForm.sex_at_birth,
      phone: patientForm.phone.trim() || null,
      email: patientForm.email.trim() || null,
      created_by: session.user.id,
    });
    setSavingPatient(false);
    if (insertError) {
      setPatientFormError("Enregistrement refusé. Vérifiez votre rôle et les politiques RLS. Aucun patient n'a été confirmé comme enregistré.");
      return;
    }
    setPatientForm(emptyPatient);
    setShowPatientForm(false);
    setSuccessMessage("Le dossier patient a été enregistré.");
    const { data, error: reloadError } = await supabase
      .from("patients")
      .select("id, patient_number, first_name, last_name, date_of_birth, sex_at_birth, phone, email, status, created_at")
      .eq("establishment_id", activeEstablishment.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (!reloadError && data) setPatients(data as Patient[]);
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
          <small>Les comptes doivent être créés et autorisés par un administrateur. Aucun compte n'est créé automatiquement.</small>
        </form>
      </main>
    );
  }

  const pageTitle = navigation.find((item) => item.key === activeModule)?.label ?? "Vue d'ensemble";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><HeartPulse size={22} /></span><div><strong>Gestion Médicale</strong><small>Clinique & centre médical</small></div></div>
        <nav aria-label="Navigation principale">
          {navigation.map(({ key, label, icon: Icon }) => (
            <button key={key} className={activeModule === key ? "nav-item active" : "nav-item"} onClick={() => setActiveModule(key)}>
              <Icon size={17}/><span>{label}</span>
              {key === "patients" && <span className="nav-count">{patients.length}</span>}
            </button>
          ))}
          <div className="nav-divider" />
          <button className="nav-item" onClick={() => setActiveModule("dashboard")}><ShieldCheck size={17}/><span>Sécurité & synchronisation</span></button>
        </nav>
        <div className="sidebar-note"><ShieldCheck size={18}/><span>Accès limité aux rôles autorisés.<br/>Les règles serveur restent obligatoires.</span></div>
      </aside>

      <section className="content" id="dashboard">
        <header className="topbar">
          <div><p className="eyebrow">ESPACE DE GESTION</p><h1>{pageTitle}</h1><p className="muted">{activeEstablishment?.name ?? "Espace clinique"}{activeModule === "dashboard" ? " · Pilotage de l'activité" : ""}</p></div>
          <div className="header-actions">
            {establishments.length > 1 && <label className="clinic-select"><span>Établissement</span><select value={activeEstablishmentId} onChange={(e) => setActiveEstablishmentId(e.target.value)}>{establishments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14}/></label>}
            <div className={online ? "status" : "status offline"}>{online ? <Wifi size={15}/> : <WifiOff size={15}/>} {online ? "Réseau disponible" : "Hors ligne"}</div>
            {session && <button className="secondary-button" onClick={signOut}><LogOut size={15}/> Déconnexion</button>}
          </div>
        </header>

        {!online && <section className="notice warning"><WifiOff size={22}/><div><strong>Connexion Internet indisponible</strong><p>Les écritures hors ligne ne sont pas encore activées. Les formulaires métier sont désactivés tant que le serveur ne peut pas confirmer l'enregistrement.</p></div></section>}
        {!isSupabaseConfigured && <section className="notice warning"><Cloud size={22}/><div><strong>Mode aperçu — Supabase non configuré</strong><p>La publication web fonctionne, mais l'authentification et les données métier nécessitent les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY. N'entrez pas de données de patients ici.</p></div></section>}
        {error && <section className="notice warning" role="alert"><ShieldCheck size={20}/><div>{error}</div></section>}

        {activeModule === "dashboard" && (
          <>
            <section className="notice"><Cloud size={22}/><div><strong>{isSupabaseConfigured ? "Connecteur Supabase configuré" : "Socle applicatif publié"}</strong><p>{isSupabaseConfigured ? "L'accès aux données est conditionné à une adhésion active et aux politiques de sécurité de l'établissement." : "Le prochain jalon consiste à configurer la base Supabase, valider les permissions et activer les modules métier."}</p></div></section>
            <section className="metrics" aria-label="Indicateurs">
              <article className="metric"><span>Patients visibles</span><strong>{isSupabaseConfigured && session ? patients.length : "—"}</strong><small>{isSupabaseConfigured && session ? "Dans l'établissement sélectionné" : "Après connexion autorisée"}</small></article>
              <article className="metric"><span>Rendez-vous</span><strong>—</strong><small>Module à développer</small></article>
              <article className="metric"><span>État de synchronisation</span><strong>{online ? "En ligne" : "Hors ligne"}</strong><small>Le mode hors ligne complet reste à implémenter</small></article>
            </section>
            <section><div className="section-heading"><div><p className="eyebrow">FONCTIONNALITÉS</p><h2>Modules de travail</h2></div><span className="pill">Développement progressif</span></div><div className="module-grid">{navigation.filter((item) => item.key !== "dashboard").map(({ key, label, icon: Icon }) => <button className="module-card module-action" key={key} onClick={() => setActiveModule(key)}><div className="module-icon"><Icon size={22}/></div><h3>{label}</h3><p>{key === "patients" ? "Créer, rechercher et consulter les dossiers administratifs." : key === "appointments" ? "Préparer l'agenda et le suivi des rendez-vous." : "Préparer le dossier de consultation sécurisé."}</p><span className={key === "patients" && isSupabaseConfigured && activeEstablishment ? "planned ready" : "planned"}>{key === "patients" && isSupabaseConfigured && activeEstablishment ? "Disponible" : "En préparation"}</span></button>)}</div></section>
          </>
        )}

        {activeModule === "patients" && (
          <section className="patients-section">
            <div className="section-heading patient-heading"><div><p className="eyebrow">REGISTRE PATIENTS</p><h2>Dossiers administratifs</h2><p className="muted">Les données sont isolées par établissement et protégées par les règles RLS.</p></div><button className="primary-button" disabled={!isSupabaseConfigured || !session || !activeEstablishment || !online} onClick={() => { setPatientFormError(""); setSuccessMessage(""); setShowPatientForm(true); }}><Plus size={17}/> Nouveau patient</button></div>
            {patientsError && <div className="inline-alert" role="status"><ShieldCheck size={18}/><span>{patientsError}</span></div>}
            {successMessage && <div className="inline-success" role="status"><Check size={18}/><span>{successMessage}</span><button aria-label="Fermer le message" onClick={() => setSuccessMessage("")}><X size={15}/></button></div>}
            <div className="table-toolbar"><div className="search-box"><Search size={17}/><input aria-label="Rechercher un patient" placeholder="Nom, numéro, téléphone ou e-mail…" value={search} onChange={(e) => setSearch(e.target.value)}/>{search && <button aria-label="Effacer la recherche" onClick={() => setSearch("")}><X size={14}/></button>}</div><span className="result-count">{filteredPatients.length} dossier(s)</span></div>
            <div className="table-wrap"><table><thead><tr><th>Patient</th><th>N° dossier</th><th>Date de naissance</th><th>Téléphone</th><th>Statut</th></tr></thead><tbody>
              {patientsLoading ? <tr><td colSpan={5} className="table-empty">Chargement des dossiers…</td></tr>
                : filteredPatients.length === 0 ? <tr><td colSpan={5} className="table-empty"><div className="empty-state"><Users size={26}/><strong>{search ? "Aucun résultat" : "Aucun dossier patient"}</strong><span>{search ? "Essayez un autre terme de recherche." : "Les dossiers autorisés apparaîtront ici après configuration et connexion."}</span></div></td></tr>
                : filteredPatients.map((patient) => <tr key={patient.id}><td><div className="patient-cell"><span className="patient-avatar">{patientInitials(patient)}</span><span><strong>{patient.first_name} {patient.last_name}</strong><small>{patient.email || "E-mail non renseigné"}</small></span></div></td><td><span className="patient-number">{patient.patient_number}</span></td><td>{formatDate(patient.date_of_birth)}</td><td>{patient.phone || "—"}</td><td><span className={patient.status === "active" ? "status-tag active-tag" : "status-tag"}>{patient.status === "active" ? "Actif" : "Archivé"}</span></td></tr>)}
            </tbody></table></div>
            <p className="table-footnote">Affichage limité aux 500 dossiers les plus récents. Les consultations et diagnostics ne sont pas affichés dans ce registre.</p>
          </section>
        )}

        {activeModule === "appointments" && <section className="coming-soon"><div className="module-icon"><CalendarDays size={24}/></div><p className="eyebrow">PROCHAIN JALON</p><h2>Agenda des rendez-vous</h2><p>Le schéma de rendez-vous existe dans la base initiale. L'interface de planification, les disponibilités praticiens et les règles anti-chevauchement restent à construire et tester.</p><button className="secondary-button" onClick={() => setActiveModule("patients")}>Aller au registre patients</button></section>}
        {activeModule === "consultations" && <section className="coming-soon"><div className="module-icon"><Activity size={24}/></div><p className="eyebrow">PROCHAIN JALON</p><h2>Consultations et dossier clinique</h2><p>Le dossier clinique doit être développé avec droits par rôle, notes signées, historique traçable et contrôles serveur avant toute utilisation clinique.</p><button className="secondary-button" onClick={() => setActiveModule("patients")}>Aller au registre patients</button></section>}

        {showPatientForm && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPatientForm(false); }}>
            <form className="patient-modal" onSubmit={createPatient}>
              <div className="modal-heading"><div><p className="eyebrow">NOUVEAU DOSSIER</p><h2>Enregistrer un patient</h2><p>Établissement : {activeEstablishment?.name ?? "non sélectionné"}</p></div><button type="button" className="icon-button" aria-label="Fermer" onClick={() => setShowPatientForm(false)}><X size={20}/></button></div>
              <div className="form-grid"><label>Prénom *<input autoFocus required maxLength={100} value={patientForm.first_name} onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })}/></label><label>Nom *<input required maxLength={100} value={patientForm.last_name} onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })}/></label><label>Date de naissance<input type="date" max={new Date().toISOString().slice(0, 10)} value={patientForm.date_of_birth} onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}/></label><label>Sexe à la naissance<select value={patientForm.sex_at_birth} onChange={(e) => setPatientForm({ ...patientForm, sex_at_birth: e.target.value as typeof patientForm.sex_at_birth })}><option value="unknown">Non renseigné</option><option value="female">Féminin</option><option value="male">Masculin</option><option value="intersex">Intersexe</option></select></label><label>Téléphone<input type="tel" maxLength={40} value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}/></label><label>E-mail<input type="email" maxLength={254} value={patientForm.email} onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}/></label></div>
              {patientFormError && <p className="form-error" role="alert">{patientFormError}</p>}
              <div className="modal-notice"><ShieldCheck size={16}/><span>Le numéro de dossier est généré automatiquement. L'enregistrement n'est confirmé qu'après validation du serveur.</span></div>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowPatientForm(false)}>Annuler</button><button type="submit" className="primary-button" disabled={savingPatient || !online}>{savingPatient ? "Enregistrement…" : <><FilePlus2 size={16}/> Enregistrer le dossier</>}</button></div>
            </form>
          </div>
        )}
        <footer>Gestion Médicale · Accès par établissement · Ne pas utiliser avec des données réelles avant validation complète de la sécurité.</footer>
      </section>
    </main>
  );
}
