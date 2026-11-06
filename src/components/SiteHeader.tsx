import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Profile } from '../types';

const links = [
  ['About', '#about'], ['Skills', '#skills'], ['Projects', '#projects'],
  ['Experience', '#experience'], ['Certificates', '#certificates'], ['Contact', '#contact'],
];

export default function SiteHeader({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const onHome = location.pathname === '/';

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link to="/" className="brand" aria-label="Shashank Kumar home"><span className="brand-mark">SK</span><span>Shashank Kumar<span className="brand-dot">.</span></span></Link>
        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X size={21} /> : <Menu size={21} />}</button>
        <nav className={open ? 'main-nav is-open' : 'main-nav'}>
          {links.map(([label, href]) => <a key={label} href={onHome ? href : `/${href}`} onClick={() => setOpen(false)}>{label}</a>)}
          <Link to="/admin" className="nav-admin" onClick={() => setOpen(false)}>Admin <ArrowUpRight size={14} /></Link>
        </nav>
        <a className="nav-cta" href={profile.linkedinUrl || 'https://www.linkedin.com/'} target="_blank" rel="noreferrer">Let’s connect <ArrowUpRight size={15} /></a>
      </div>
    </header>
  );
}
