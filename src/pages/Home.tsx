import { ArrowDown, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Code2, Download, ExternalLink, Github, GraduationCap, Linkedin, Mail, MapPin, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import type { PortfolioData } from '../types';

function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <div className="section-heading"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{note && <p>{note}</p>}</div>;
}

export default function Home({ data, loading }: { data: PortfolioData; loading: boolean }) {
  const { profile } = data;
  const skillGroups = [...new Set(data.skills.map((skill) => skill.category || 'Other'))];
  const featured = data.projects.filter((project) => project.featured);
  const projects = featured.length ? featured : data.projects;

  return (
    <div className="public-site">
      <SiteHeader profile={profile} />
      <main>
        <section className="hero-section" id="top">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="availability"><span className="availability-dot" /> OPEN TO LEARNING & OPPORTUNITIES</div>
              <p className="hero-kicker">HELLO, I'M</p>
              <h1>{profile.name}<span className="hero-period">.</span></h1>
              <h2>{profile.headline}</h2>
              <p className="hero-tagline">{profile.tagline}</p>
              <p className="hero-intro">{profile.about}</p>
              <div className="hero-actions"><a className="button button-primary" href="#projects">Explore my work <ArrowRight size={17} /></a><a className="button button-secondary" href="#contact">Get in touch <ArrowUpRight size={16} /></a></div>
              <div className="hero-socials"><a href={profile.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={17} /> LinkedIn</a>{profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer"><Github size={17} /> GitHub</a>}<span className="social-separator" />{profile.location && <span><MapPin size={15} /> {profile.location}</span>}</div>
            </div>
            <div className="hero-visual-wrap">
              <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
              <div className="hero-card">
                <div className="hero-card-top"><span className="mini-label">PROFILE SNAPSHOT</span><span className="live-dot" /></div>
                {profile.photoUrl ? <img className="hero-avatar" src={profile.photoUrl} alt={profile.name} /> : <div className="hero-avatar avatar-initials">{profile.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>}
                <h3>{profile.name}</h3><p>{profile.headline}</p>
                <div className="hero-card-line" />
                <div className="snapshot-row"><span>FOCUS AREA</span><strong>{profile.focus || 'AI · Data · Software'}</strong></div>
                <div className="snapshot-row"><span>EDUCATION</span><strong>{profile.degree.split('—')[0].trim()}</strong></div>
                <div className="snapshot-footer"><span><Sparkles size={14} /> Always learning</span><span>01 / 01</span></div>
              </div>
              <div className="floating-note note-code"><Code2 size={16} /><span>Build<br /><strong>Learn</strong></span></div>
              <div className="floating-note note-data"><span className="data-bars"><i /><i /><i /><i /></span><span>Curiosity<br /><strong>driven</strong></span></div>
              <div className="hero-visual-caption">A little about what I do <ArrowDown size={14} /></div>
            </div>
          </div>
          <div className="hero-bottom-line"><span>SCROLL TO EXPLORE</span><span className="scroll-line" /><span>PORTFOLIO · 2026</span></div>
        </section>

        <section className="about-section section-pad" id="about">
          <div className="section-layout"><SectionHeading eyebrow="01 / ABOUT ME" title="A learner at heart." note="A little context about my journey so far." />
            <div className="about-content"><p className="about-lead">I like turning <em>curiosity into code</em> and ideas into practical projects.</p><p>{profile.about}</p>
              <div className="education-card"><div className="education-icon"><GraduationCap size={22} /></div><div><span className="mini-label">CURRENT EDUCATION</span><h3>{profile.degree}</h3><p>{profile.college}</p></div><span className="education-status">Student</span></div>
            </div>
          </div>
        </section>

        <section className="skills-section section-pad" id="skills">
          <div className="section-top-row"><SectionHeading eyebrow="02 / TOOLKIT" title="Skills & technologies." note="Tools and concepts I’m learning, exploring, and using." /><span className="section-index">A GROWING TOOLKIT</span></div>
          {loading ? <div className="loading-copy">Loading skills…</div> : data.skills.length ? <div className="skill-groups">{skillGroups.map((group) => <div className="skill-group" key={group}><h3>{group}</h3><div className="skill-pills">{data.skills.filter((skill) => (skill.category || 'Other') === group).map((skill) => <span className="skill-pill" key={skill.id}><span className="skill-dot" />{skill.name}</span>)}</div></div>)}</div> : <div className="empty-state"><Code2 size={22} /><p>Skills will appear here as they’re added from the admin dashboard.</p></div>}
        </section>

        <section className="projects-section section-pad" id="projects">
          <div className="section-top-row"><SectionHeading eyebrow="03 / SELECTED WORK" title="Projects in progress." note="A collection of things I’ve built, explored, or am currently working on." /><Link to="/admin" className="text-link">Manage projects <ArrowUpRight size={15} /></Link></div>
          {loading ? <div className="loading-copy">Loading projects…</div> : projects.length ? <div className="project-grid">{projects.map((project, index) => <article className="project-card" key={project.id}>
            <div className={`project-art project-art-${index % 3}`}>{project.imageUrl ? <img src={project.imageUrl} alt="" /> : <div className="project-art-content"><span className="project-number">0{index + 1}</span><div className="project-art-symbol">{index % 3 === 0 ? <Code2 size={42} /> : index % 3 === 1 ? <Sparkles size={42} /> : <BriefcaseBusiness size={42} />}</div><span className="project-art-label">{project.tech.slice(0, 2).join(' / ') || 'PERSONAL PROJECT'}</span></div>}<span className="project-status">{project.status}</span></div>
            <div className="project-info"><div className="project-title-row"><h3>{project.title}</h3><span className="project-arrow"><ArrowUpRight size={18} /></span></div><p>{project.summary}</p><div className="tech-tags">{project.tech.map((tech) => <span key={tech}>{tech}</span>)}</div><div className="project-links">{project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer"><Github size={15} /> Source code</a>}{project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Live demo</a>}</div></div>
          </article>)}</div> : <div className="empty-state empty-large"><div className="empty-icon"><Code2 size={24} /></div><h3>The next idea starts here.</h3><p>Projects you publish will show up in this space. Until then, I’m building and learning.</p><Link to="/admin" className="text-link">Add your first project <ArrowUpRight size={15} /></Link></div>}
        </section>

        <section className="experience-section section-pad" id="experience">
          <div className="section-layout"><SectionHeading eyebrow="04 / EXPERIENCE" title="Learning by doing." note="Practical experience, internships, and roles." />
            <div className="timeline">{data.experience.length ? data.experience.map((item) => <article className="timeline-item" key={item.id}><span className="timeline-dot" /><div className="timeline-head"><div><h3>{item.role}</h3><p>{item.company}{item.location ? ` · ${item.location}` : ''}</p></div><span>{item.startDate}{item.endDate ? ` — ${item.endDate}` : ''}</span></div><p className="timeline-description">{item.description}</p></article>) : <div className="quiet-empty"><BriefcaseBusiness size={20} /><p>Experience and internship details will appear here when published.</p></div>}</div>
          </div>
        </section>

        <section className="cert-section section-pad" id="certificates">
          <div className="section-top-row"><SectionHeading eyebrow="05 / CERTIFICATIONS" title="Always expanding." note="Courses, certificates, and credentials that mark my learning journey." /><span className="cert-count">{String(data.certificates.length).padStart(2, '0')} CREDENTIALS</span></div>
          {data.certificates.length ? <div className="certificate-grid">{data.certificates.map((cert) => <article className="certificate-card" key={cert.id}><div className="certificate-icon"><CheckCircle2 size={20} /></div><div className="certificate-main"><h3>{cert.title}</h3><p>{cert.issuer}</p><span>{cert.issueDate}</span></div>{cert.credentialUrl && <a href={cert.credentialUrl} target="_blank" rel="noreferrer" aria-label={`View ${cert.title}`}><ArrowUpRight size={17} /></a>}{cert.fileUrl && <a href={cert.fileUrl} target="_blank" rel="noreferrer">View file <ExternalLink size={14} /></a>}</article>)}</div> : <div className="empty-state"><GraduationCap size={22} /><p>Certificates you add in the dashboard will be displayed here.</p></div>}
        </section>

        {data.achievements.length > 0 && <section className="achievements-section section-pad"><SectionHeading eyebrow="06 / MILESTONES" title="Small wins, big lessons." /><div className="achievement-grid">{data.achievements.map((item) => <article key={item.id} className="achievement-card"><CalendarDays size={18} /><h3>{item.title}</h3><p>{item.description}</p><span>{item.date}</span></article>)}</div></section>}

        <section className="contact-section section-pad" id="contact"><div className="contact-panel"><div className="contact-orb" /><div className="contact-copy"><span className="eyebrow">LET’S CONNECT</span><h2>Have an idea?<br /><em>Let’s talk.</em></h2><p>I’m open to learning opportunities, collaboration, and conversations around AI, data, and technology.</p></div><div className="contact-actions">{profile.email ? <a className="button button-light" href={`mailto:${profile.email}`}><Mail size={17} /> Email me <ArrowUpRight size={16} /></a> : <a className="button button-light" href={profile.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={17} /> Connect on LinkedIn <ArrowUpRight size={16} /></a>}{profile.resumeUrl && <a className="contact-resume" href={profile.resumeUrl} target="_blank" rel="noreferrer"><Download size={15} /> View résumé</a>}</div></div></section>
      </main>
      <SiteFooter profile={profile} />
    </div>
  );
}
