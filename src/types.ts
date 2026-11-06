export type Skill = { id: string; name: string; category: string };
export type Project = {
  id: string;
  title: string;
  summary: string;
  description: string;
  tech: string[];
  githubUrl: string;
  liveUrl: string;
  imageUrl: string;
  status: 'In progress' | 'Completed' | 'Concept';
  featured: boolean;
};
export type Experience = {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};
export type Certificate = {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  credentialUrl: string;
  fileUrl: string;
};
export type Achievement = { id: string; title: string; description: string; date: string };
export type LinkedInIdentity = {
  sub?: string;
  name?: string;
  headline?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
};
export type Profile = {
  name: string;
  headline: string;
  tagline: string;
  about: string;
  location: string;
  degree: string;
  college: string;
  focus: string;
  email: string;
  phone: string;
  photoUrl: string;
  resumeUrl: string;
  linkedinUrl: string;
  githubUrl: string;
};
export type PortfolioData = {
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  experience: Experience[];
  certificates: Certificate[];
  achievements: Achievement[];
  linkedinIdentity?: LinkedInIdentity | null;
  updatedAt?: string;
};
