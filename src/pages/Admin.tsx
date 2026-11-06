import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isLocalAdminEnabled, isSupabaseConfigured } from '../lib/supabase';
import { savePortfolio, uploadAsset } from '../lib/portfolio';
import type { Achievement, Certificate, Experience, LinkedInIdentity, PortfolioData, Project, Skill } from '../types';
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, Check, ChevronRight, FileUp, FolderKanban, GraduationCap, Linkedin, Link2, LogOut, Plus, Save, ShieldCheck, Sparkles, Trash2, UserRound, X } from 'lucide-react';

const newId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const blankProject = (): Project => ({ id: newId(), title: '', summary: '', description: '', tech: [], githubUrl: '', liveUrl: '', imageUrl: '', status: 'In progress', featured: false });
const blankExperience = (): Experience => ({ id: newId(), role: '', company: '', location: '', startDate: '', endDate: '', description: '' });
const blankCertificate = (): Certificate => ({ id: newId(), title: '', issuer: '', issueDate: '', credentialUrl: '', fileUrl: '' });
const blankAchievement = (): Achievement => ({ id: newId(), title: '', description: '', date: '' });

function Field({ label, value, onChange, placeholder, multiline = false, type = 'text', hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; type?: string; hint?: string }) {
  return <label className="admin-field"><span>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}{hint && <small>{hint}</small>}</label>;
}

function SectionTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="admin-section-title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

function csvRows(input: string): Record<string, string>[] {
  const lines = input.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const parseLine = (line: string) => {
    const cells: string[] = [];
    let current = ''; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) { current += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { cells.push(current.trim()); current = ''; }
      else current += char;
    }
    cells.push(current.trim());
    return cells;
  };
  const headers = parseLine(lines[0]).map((header) => header.toLowerCase().replace(/[\s-]+/g, '_'));
  return lines.slice(1).filter((line) => line.trim()).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

export default function Admin({ data, onSaved, loading }: { data: PortfolioData; onSaved: () => Promise<void>; loading: boolean }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<PortfolioData>(data);
  const [section, setSection] = useState('profile');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loggedIn, setLoggedIn] = useState(isLocalAdminEnabled && !isSupabaseConfigured);
  const [authChecking, setAuthChecking] = useState(isSupabaseConfigured);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [linkedinIdentity, setLinkedinIdentity] = useState<LinkedInIdentity | null>(data.linkedinIdentity ?? null);
  const [importText, setImportText] = useState('');
  const [importType, setImportType] = useState<'json' | 'skills' | 'projects' | 'certificates' | 'experience'>('json');
  const [pendingImport, setPendingImport] = useState<PortfolioData | null>(null);

  useEffect(() => setDraft(data), [data]);
  useEffect(() => setLinkedinIdentity(data.linkedinIdentity ?? null), [data.linkedinIdentity]);

  useEffect(() => {
    // Keep a local reference so TypeScript can safely narrow the nullable client.
    const client = supabase;

    if (!client) {
      setAuthChecking(false);
      return;
    }

    let alive = true;

    client.auth.getSession().then(async ({ data: sessionData }) => {
      if (!alive) return;

      const user = sessionData.session?.user;
      if (!user) {
        setLoggedIn(false);
        setAuthChecking(false);
        return;
      }

      setUserEmail(user.email ?? '');

      const { data: adminRow, error: adminError } = await client
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!alive) return;

      if (adminError) {
        setError(`Could not verify admin access: ${adminError.message}`);
      }

      setLoggedIn(Boolean(adminRow));
      setAuthChecking(false);
    });

    const { data: listener } = client.auth.onAuthStateChange(
      async (_event, session) => {
        if (!alive) return;

        const user = session?.user;
        if (!user) {
          setLoggedIn(false);
          setUserEmail('');
          return;
        }

        setUserEmail(user.email ?? '');

        const { data: adminRow } = await client
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!alive) return;

        setLoggedIn(Boolean(adminRow));
        if (!adminRow) {
          setError('You are signed in, but this account is not on the portfolio admin allowlist.');
        }
      }
    );

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const receiveLinkedIn = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'linkedin-auth-error') { setError(event.data.message || 'LinkedIn connection failed.'); return; }
      if (event.data?.type !== 'linkedin-auth-success') return;
      const identity = event.data.profile as LinkedInIdentity;
      setLinkedinIdentity(identity);
      setDraft((current) => ({ ...current, linkedinIdentity: identity, profile: { ...current.profile, ...(identity.name ? { name: identity.name } : {}), ...(identity.headline ? { headline: identity.headline } : {}), ...(identity.picture ? { photoUrl: identity.picture } : {}) } }));
      setNotice(`LinkedIn identity connected${identity.name ? ` as ${identity.name}` : ''}. Available name/photo fields have been refreshed; skills, projects, experience, and certificates remain editable below.`);
      setError('');
    };
    window.addEventListener('message', receiveLinkedIn);
    return () => window.removeEventListener('message', receiveLinkedIn);
  }, []);

  const unsaved = useMemo(() => JSON.stringify(draft) !== JSON.stringify(data), [draft, data]);
  const setProfile = (key: keyof PortfolioData['profile'], value: string) => setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setBusy(true);
    if (!supabase) { setError('Set up Supabase to use production admin login.'); setBusy(false); return; }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (loginError) setError(loginError.message);
    setBusy(false);
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setLoggedIn(false); setUserEmail('');
    navigate('/');
  };

  const save = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await savePortfolio(draft);
      await onSaved();
      setNotice('Changes saved. Your public portfolio is up to date.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save changes. Check your backend configuration.');
    } finally { setBusy(false); }
  };

  const updateItem = <T extends { id: string }>(
    key: 'skills' | 'projects' | 'experience' | 'certificates' | 'achievements',
    id: string,
    patch: Partial<T>
  ) => {
    setDraft((current) => {
      // Each key points to a different item type; the caller supplies that type as T.
      const items = current[key] as unknown as T[];
      const updatedItems = items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      );

      return {
        ...current,
        [key]: updatedItems,
      };
    });
  };
  const removeItem = (key: 'skills' | 'projects' | 'experience' | 'certificates' | 'achievements', id: string) => {
    setDraft((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
  };

  const connectLinkedIn = () => {
    const popup = window.open('/api/linkedin/authorize', 'linkedin-connect', 'popup,width=620,height=720');
    if (!popup) setError('Your browser blocked the LinkedIn popup. Allow popups for this site and try again.');
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError('');
    try { callback(await uploadAsset(file)); setNotice(`${file.name} uploaded.`); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.'); }
    finally { setBusy(false); event.target.value = ''; }
  };

  const handleImport = () => {
    setError(''); setNotice('');
    try {
      if (importType === 'json') {
        const parsed = JSON.parse(importText) as Partial<PortfolioData>;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON must be an object.');
        const merged = { ...draft, ...parsed, profile: { ...draft.profile, ...(parsed.profile ?? {}) } } as PortfolioData;
        setPendingImport(merged);
      } else {
        const rows = csvRows(importText);
        if (!rows.length) throw new Error('No data rows found. Add a header row and at least one record.');
        if (importType === 'skills') {
          const items: Skill[] = rows.map((row) => ({ id: newId(), name: row.name ?? row.skill ?? '', category: row.category ?? 'Other' })).filter((item) => item.name);
          setPendingImport({ ...draft, skills: [...draft.skills, ...items] });
        } else if (importType === 'projects') {
          const items: Project[] = rows.map((row) => ({ id: newId(), title: row.title ?? '', summary: row.summary ?? row.description ?? '', description: row.description ?? '', tech: (row.tech ?? row.technologies ?? '').split(/[;|]/).map((x) => x.trim()).filter(Boolean), githubUrl: row.github_url ?? row.github ?? '', liveUrl: row.live_url ?? row.demo ?? '', imageUrl: '', status: 'Completed' as Project['status'], featured: false })).filter((item) => item.title);
          setPendingImport({ ...draft, projects: [...draft.projects, ...items] });
        } else if (importType === 'certificates') {
          const items: Certificate[] = rows.map((row) => ({ id: newId(), title: row.title ?? row.name ?? '', issuer: row.issuer ?? row.organization ?? '', issueDate: row.issue_date ?? row.date ?? '', credentialUrl: row.credential_url ?? row.url ?? '', fileUrl: '' })).filter((item) => item.title);
          setPendingImport({ ...draft, certificates: [...draft.certificates, ...items] });
        } else {
          const items: Experience[] = rows.map((row) => ({ id: newId(), role: row.role ?? row.title ?? '', company: row.company ?? row.organization ?? '', location: row.location ?? '', startDate: row.start_date ?? '', endDate: row.end_date ?? '', description: row.description ?? '' })).filter((item) => item.role);
          setPendingImport({ ...draft, experience: [...draft.experience, ...items] });
        }
      }
    } catch (importError) { setError(importError instanceof Error ? importError.message : 'Could not parse import data.'); }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    setDraft(pendingImport); setPendingImport(null); setImportText('');
    setNotice('Import staged. Review the sections, then click Save changes to publish.');
  };

  const navItems = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'skills', label: 'Skills', icon: Sparkles },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'experience', label: 'Experience', icon: BriefcaseBusiness },
    { id: 'certificates', label: 'Certificates', icon: GraduationCap },
    { id: 'achievements', label: 'Achievements', icon: BadgeCheck },
    { id: 'linkedin', label: 'LinkedIn & import', icon: Linkedin },
  ];

  if (loading || authChecking) return <div className="admin-loading"><div className="loading-spinner" /><p>Preparing your dashboard…</p></div>;
  if (!loggedIn) return (
    <div className="login-page"><div className="login-card"><a href="/" className="back-link"><ArrowLeft size={16} /> Back to portfolio</a><div className="login-symbol"><ShieldCheck size={25} /></div><span className="eyebrow">PRIVATE WORKSPACE</span><h1>Welcome back.</h1><p>Sign in to update your portfolio, projects, skills, and certificates.</p>
      {isLocalAdminEnabled && <div className="local-mode-note"><Sparkles size={16} /><span><strong>Local preview mode</strong><br />You’re using browser storage on this development machine. This mode is disabled in production.</span></div>}
      {isSupabaseConfigured ? <form onSubmit={handleLogin} className="login-form"><Field label="Email address" value={loginEmail} onChange={setLoginEmail} type="email" placeholder="you@example.com" /><Field label="Password" value={loginPassword} onChange={setLoginPassword} type="password" placeholder="Your password" /><button className="button button-primary full-width" type="submit" disabled={busy}>Sign in <ChevronRight size={17} /></button></form> : <div className="local-login"><p>{isLocalAdminEnabled ? 'No cloud backend is configured. Continue in local demo mode to edit a browser-only copy.' : 'Connect Supabase and create an admin account to enable secure editing.'}</p>{isLocalAdminEnabled && <button className="button button-primary full-width" onClick={() => setLoggedIn(true)}>Continue in local demo <ChevronRight size={17} /></button>}</div>}
      {error && <div className="admin-error">{error}</div>}<p className="login-footnote">Admin access is private. Public visitors can only view published portfolio content.</p>
    </div></div>
  );

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar"><a href="/" className="brand admin-brand"><span className="brand-mark">SK</span><span>Portfolio<span className="brand-dot">.</span></span></a><div className="admin-side-label">WORKSPACE</div><nav className="admin-nav">{navItems.map((item) => <button key={item.id} className={section === item.id ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setSection(item.id)}><item.icon size={17} /><span>{item.label}</span>{section === item.id && <ChevronRight size={14} />}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-user"><span className="user-avatar">{(userEmail || 'SK')[0].toUpperCase()}</span><div><strong>{userEmail || 'Local editor'}</strong><span>{isLocalAdminEnabled && !isSupabaseConfigured ? 'Local preview' : 'Administrator'}</span></div></div><button className="sidebar-logout" onClick={logout}><LogOut size={16} /> Sign out</button><a href="/" className="back-to-site"><ArrowLeft size={15} /> View public site</a></div></aside>
      <main className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">PORTFOLIO MANAGER</span><h1>Dashboard</h1></div><div className="admin-top-actions"><span className={unsaved ? 'save-state unsaved' : 'save-state'}>{unsaved ? 'Unsaved changes' : 'All changes saved'}</span><button className="button button-primary save-button" onClick={save} disabled={busy || !unsaved}><Save size={16} /> {busy ? 'Saving…' : 'Save changes'}</button></div></header>
        {(notice || error) && <div className={error ? 'admin-alert error' : 'admin-alert success'}><span>{error || notice}</span><button onClick={() => { setNotice(''); setError(''); }} aria-label="Dismiss"><X size={16} /></button></div>}
        {section === 'profile' && <section className="admin-panel"><SectionTitle eyebrow="01 / IDENTITY" title="Your profile" description="Your introduction and the details visitors see first." />
          <div className="admin-form-grid"><Field label="Full name" value={draft.profile.name} onChange={(value) => setProfile('name', value)} /><Field label="Professional headline" value={draft.profile.headline} onChange={(value) => setProfile('headline', value)} /><Field label="Short role / focus line" value={draft.profile.tagline} onChange={(value) => setProfile('tagline', value)} /><Field label="Location" value={draft.profile.location} onChange={(value) => setProfile('location', value)} /><Field label="Degree / programme" value={draft.profile.degree} onChange={(value) => setProfile('degree', value)} /><Field label="College / university" value={draft.profile.college} onChange={(value) => setProfile('college', value)} /><Field label="Focus areas" value={draft.profile.focus} onChange={(value) => setProfile('focus', value)} /><Field label="Email" value={draft.profile.email} onChange={(value) => setProfile('email', value)} type="email" /><Field label="Phone (optional)" value={draft.profile.phone} onChange={(value) => setProfile('phone', value)} /><Field label="LinkedIn URL" value={draft.profile.linkedinUrl} onChange={(value) => setProfile('linkedinUrl', value)} /><Field label="GitHub URL" value={draft.profile.githubUrl} onChange={(value) => setProfile('githubUrl', value)} /><Field label="Profile photo URL" value={draft.profile.photoUrl} onChange={(value) => setProfile('photoUrl', value)} />
            <Field label="About me" value={draft.profile.about} onChange={(value) => setProfile('about', value)} multiline />
            <Field label="Résumé URL" value={draft.profile.resumeUrl} onChange={(value) => setProfile('resumeUrl', value)} hint="Upload a PDF below or paste a public link." />
            <label className="upload-field"><span>Upload résumé (PDF) / profile image</span><input type="file" accept="application/pdf,image/*" onChange={(event) => upload(event, (url) => setDraft((current) => ({ ...current, profile: { ...current.profile, ...(event.target.files?.[0]?.type.startsWith('image/') ? { photoUrl: url } : { resumeUrl: url }) } })))} /><small>Uploads require Supabase Storage to be configured.</small></label>
          </div>
        </section>}

        {section === 'skills' && <section className="admin-panel"><SectionTitle eyebrow="02 / TOOLKIT" title="Skills" description="Group related skills so visitors can scan your toolkit." action={<button className="button button-outline" onClick={() => setDraft((current) => ({ ...current, skills: [...current.skills, { id: newId(), name: '', category: 'Programming' }] }))}><Plus size={16} /> Add skill</button>} />
          <div className="admin-list">{draft.skills.map((skill) => <div className="admin-item skill-editor" key={skill.id}><Field label="Skill name" value={skill.name} onChange={(value) => updateItem<Skill>('skills', skill.id, { name: value })} placeholder="e.g. Python" /><Field label="Category" value={skill.category} onChange={(value) => updateItem<Skill>('skills', skill.id, { category: value })} placeholder="e.g. Programming" /><button className="icon-danger" onClick={() => removeItem('skills', skill.id)} aria-label="Delete skill"><Trash2 size={17} /></button></div>)}{draft.skills.length === 0 && <div className="admin-empty">No skills yet. Add your first one above.</div>}</div>
        </section>}

        {section === 'projects' && <section className="admin-panel"><SectionTitle eyebrow="03 / SELECTED WORK" title="Projects" description="Show what you’ve built, including work in progress." action={<button className="button button-outline" onClick={() => setDraft((current) => ({ ...current, projects: [...current.projects, blankProject()] }))}><Plus size={16} /> Add project</button>} />
          <div className="admin-list">{draft.projects.map((project) => <article className="admin-card" key={project.id}><div className="admin-card-heading"><strong>{project.title || 'New project'}</strong><button className="icon-danger" onClick={() => removeItem('projects', project.id)} aria-label="Delete project"><Trash2 size={17} /></button></div><div className="admin-form-grid"><Field label="Project title" value={project.title} onChange={(value) => updateItem<Project>('projects', project.id, { title: value })} /><Field label="Short summary" value={project.summary} onChange={(value) => updateItem<Project>('projects', project.id, { summary: value })} /><Field label="Technologies (comma separated)" value={project.tech.join(', ')} onChange={(value) => updateItem<Project>('projects', project.id, { tech: value.split(',').map((x) => x.trim()).filter(Boolean) })} /><label className="admin-field"><span>Status</span><select value={project.status} onChange={(event) => updateItem<Project>('projects', project.id, { status: event.target.value as Project['status'] })}><option>In progress</option><option>Completed</option><option>Concept</option></select></label><Field label="GitHub URL" value={project.githubUrl} onChange={(value) => updateItem<Project>('projects', project.id, { githubUrl: value })} /><Field label="Live demo URL" value={project.liveUrl} onChange={(value) => updateItem<Project>('projects', project.id, { liveUrl: value })} /><Field label="Cover image URL" value={project.imageUrl} onChange={(value) => updateItem<Project>('projects', project.id, { imageUrl: value })} /><Field label="Full description" value={project.description} onChange={(value) => updateItem<Project>('projects', project.id, { description: value })} multiline /><label className="admin-checkbox"><input type="checkbox" checked={project.featured} onChange={(event) => updateItem<Project>('projects', project.id, { featured: event.target.checked })} /> Feature this project near the top</label></div></article>)}{draft.projects.length === 0 && <div className="admin-empty">No projects yet. Add a project when you’re ready to showcase it.</div>}</div>
        </section>}

        {section === 'experience' && <section className="admin-panel"><SectionTitle eyebrow="04 / EXPERIENCE" title="Experience" description="Internships, work experience, volunteering, or leadership roles." action={<button className="button button-outline" onClick={() => setDraft((current) => ({ ...current, experience: [...current.experience, blankExperience()] }))}><Plus size={16} /> Add experience</button>} />
          <div className="admin-list">{draft.experience.map((item) => <article className="admin-card" key={item.id}><div className="admin-card-heading"><strong>{item.role || 'New experience'}</strong><button className="icon-danger" onClick={() => removeItem('experience', item.id)} aria-label="Delete experience"><Trash2 size={17} /></button></div><div className="admin-form-grid"><Field label="Role / title" value={item.role} onChange={(value) => updateItem<Experience>('experience', item.id, { role: value })} /><Field label="Company / organization" value={item.company} onChange={(value) => updateItem<Experience>('experience', item.id, { company: value })} /><Field label="Location" value={item.location} onChange={(value) => updateItem<Experience>('experience', item.id, { location: value })} /><Field label="Start date" value={item.startDate} onChange={(value) => updateItem<Experience>('experience', item.id, { startDate: value })} placeholder="e.g. Jun 2026" /><Field label="End date" value={item.endDate} onChange={(value) => updateItem<Experience>('experience', item.id, { endDate: value })} placeholder="e.g. Aug 2026 or Present" /><Field label="Description" value={item.description} onChange={(value) => updateItem<Experience>('experience', item.id, { description: value })} multiline /></div></article>)}{draft.experience.length === 0 && <div className="admin-empty">No experience entries yet. You can add internships and roles here.</div>}</div>
        </section>}

        {section === 'certificates' && <section className="admin-panel"><SectionTitle eyebrow="05 / CREDENTIALS" title="Certificates" description="Add courses, certifications, and certificate files or verification links." action={<button className="button button-outline" onClick={() => setDraft((current) => ({ ...current, certificates: [...current.certificates, blankCertificate()] }))}><Plus size={16} /> Add certificate</button>} />
          <div className="admin-list">{draft.certificates.map((cert) => <article className="admin-card" key={cert.id}><div className="admin-card-heading"><strong>{cert.title || 'New certificate'}</strong><button className="icon-danger" onClick={() => removeItem('certificates', cert.id)} aria-label="Delete certificate"><Trash2 size={17} /></button></div><div className="admin-form-grid"><Field label="Certificate title" value={cert.title} onChange={(value) => updateItem<Certificate>('certificates', cert.id, { title: value })} /><Field label="Issuing organization" value={cert.issuer} onChange={(value) => updateItem<Certificate>('certificates', cert.id, { issuer: value })} /><Field label="Issue date" value={cert.issueDate} onChange={(value) => updateItem<Certificate>('certificates', cert.id, { issueDate: value })} /><Field label="Credential verification URL" value={cert.credentialUrl} onChange={(value) => updateItem<Certificate>('certificates', cert.id, { credentialUrl: value })} /><Field label="Certificate file URL" value={cert.fileUrl} onChange={(value) => updateItem<Certificate>('certificates', cert.id, { fileUrl: value })} /><label className="upload-field"><span>Upload certificate (PDF/image)</span><input type="file" accept="application/pdf,image/*" onChange={(event) => upload(event, (url) => updateItem<Certificate>('certificates', cert.id, { fileUrl: url }))} /><small>Requires Supabase Storage.</small></label></div></article>)}{draft.certificates.length === 0 && <div className="admin-empty">Your certificates will appear on the public site after you add them here.</div>}</div>
        </section>}

        {section === 'achievements' && <section className="admin-panel"><SectionTitle eyebrow="06 / MILESTONES" title="Achievements" description="Awards, competitions, milestones, and other highlights." action={<button className="button button-outline" onClick={() => setDraft((current) => ({ ...current, achievements: [...current.achievements, blankAchievement()] }))}><Plus size={16} /> Add achievement</button>} />
          <div className="admin-list">{draft.achievements.map((item) => <article className="admin-card" key={item.id}><div className="admin-card-heading"><strong>{item.title || 'New achievement'}</strong><button className="icon-danger" onClick={() => removeItem('achievements', item.id)} aria-label="Delete achievement"><Trash2 size={17} /></button></div><div className="admin-form-grid"><Field label="Title" value={item.title} onChange={(value) => updateItem<Achievement>('achievements', item.id, { title: value })} /><Field label="Date" value={item.date} onChange={(value) => updateItem<Achievement>('achievements', item.id, { date: value })} /><Field label="Description" value={item.description} onChange={(value) => updateItem<Achievement>('achievements', item.id, { description: value })} multiline /></div></article>)}{draft.achievements.length === 0 && <div className="admin-empty">No achievements added yet.</div>}</div>
        </section>}

        {section === 'linkedin' && <section className="admin-panel"><SectionTitle eyebrow="07 / CONNECTIONS" title="LinkedIn & data import" description="Connect the basic identity API, then import the rest of your portfolio details safely." />
          <div className="linkedin-status-card"><div className="linkedin-icon"><Linkedin size={23} /></div><div className="linkedin-status-copy"><div className="connection-heading"><h3>LinkedIn identity</h3><span className={linkedinIdentity ? 'connection-badge connected' : 'connection-badge'}>{linkedinIdentity ? 'Connected' : 'Not connected'}</span></div><p>{linkedinIdentity ? `Connected identity: ${linkedinIdentity.name || 'LinkedIn member'}${linkedinIdentity.email ? ` · ${linkedinIdentity.email}` : ''}` : 'Reconnect to refresh basic identity fields (name and photo when available).'}</p><button className="button button-outline" onClick={connectLinkedIn}><Link2 size={16} /> {linkedinIdentity ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}</button></div></div>
          <div className="api-explainer"><strong>What LinkedIn can share here</strong><p>The standard self-serve OpenID Connect permissions are limited to basic identity fields such as name, profile photo, and email (when approved). Reconnecting can refresh those fields. They do not expose your full skills, project list, work history, education, or certificates. This site does not scrape LinkedIn or use unofficial endpoints.</p><p>After authorizing, use the import tool below or edit the sections directly to keep your full portfolio current.</p></div>
          <div className="import-card"><div className="import-heading"><div><span className="eyebrow">SAFE FALLBACK</span><h3>Import portfolio data</h3><p>Paste JSON or CSV exported/assembled by you. Preview is staged locally first; it will not publish until you save.</p></div><FileUp size={23} /></div>
            <label className="admin-field"><span>Import format</span><select value={importType} onChange={(event) => setImportType(event.target.value as typeof importType)}><option value="json">Full portfolio JSON</option><option value="skills">Skills CSV</option><option value="projects">Projects CSV</option><option value="certificates">Certificates CSV</option><option value="experience">Experience CSV</option></select></label>
            <textarea className="import-textarea" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={importType === 'json' ? '{\n  "skills": [],\n  "projects": [],\n  "certificates": []\n}' : importType === 'skills' ? 'name,category\nPython,Programming\nPandas,Data & ML' : importType === 'projects' ? 'title,summary,tech,github_url,live_url\nMy project,A short description,"Python;Pandas",https://github.com/...' : importType === 'certificates' ? 'title,issuer,issue_date,credential_url\nPython Basics,Example Academy,Oct 2026,https://...' : 'role,company,location,start_date,end_date,description\nIntern,Example Org,Remote,Jun 2026,Aug 2026,Worked on ...'} />
            <div className="import-actions"><button className="button button-primary" onClick={handleImport} disabled={!importText.trim()}><FileUp size={16} /> Review import</button><button className="button button-ghost" onClick={() => setImportText('')}>Clear</button></div>
            {pendingImport && <div className="import-preview"><div><Check size={17} /><strong>Import preview ready</strong></div><p>{pendingImport.skills.length - draft.skills.length > 0 ? `${pendingImport.skills.length - draft.skills.length} skill(s), ` : ''}{pendingImport.projects.length - draft.projects.length > 0 ? `${pendingImport.projects.length - draft.projects.length} project(s), ` : ''}{pendingImport.certificates.length - draft.certificates.length > 0 ? `${pendingImport.certificates.length - draft.certificates.length} certificate(s), ` : ''}{pendingImport.experience.length - draft.experience.length > 0 ? `${pendingImport.experience.length - draft.experience.length} experience item(s)` : 'review your imported fields'} staged for review.</p><div className="import-actions"><button className="button button-primary" onClick={confirmImport}>Apply to editor</button><button className="button button-ghost" onClick={() => setPendingImport(null)}>Cancel</button></div></div>}
          </div>
          <div className="api-explainer"><strong>Data stays yours</strong><p>Never paste your LinkedIn password, cookies, session token, or private access credentials into this dashboard. Only import data that you downloaded or prepared yourself and have the right to use.</p></div>
        </section>}
        <footer className="admin-footer"><span>Portfolio Manager · {new Date().getFullYear()}</span><a href="/" target="_blank" rel="noreferrer">Open public site <ArrowLeft size={14} /></a></footer>
      </main>
    </div>
  );
}
