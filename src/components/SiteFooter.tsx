import { ArrowUpRight, Github, Linkedin } from 'lucide-react';
import type { Profile } from '../types';

export default function SiteFooter({ profile }: { profile: Profile }) {
  return (
    <footer className="site-footer">
      <div className="footer-top"><div><span className="footer-monogram">SK</span><p>Curious mind. Continuous learner.<br />Building one project at a time.</p></div>
        <div className="footer-links"><a href={profile.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={17} /> LinkedIn <ArrowUpRight size={13} /></a>{profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer"><Github size={17} /> GitHub <ArrowUpRight size={13} /></a>}</div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {profile.name}. All rights reserved.</span><span>Designed & built with curiosity.</span></div>
    </footer>
  );
}
