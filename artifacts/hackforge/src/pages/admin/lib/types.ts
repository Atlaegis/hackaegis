export interface Hackathon {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  status: string;
  phase: string;
  streamUrl: string | null;
  streamActive: boolean;
  resultsPublished: boolean;
  judgeResultsVisible: boolean;
  prizePool: string | null;
  grandPrize: string | null;
  submissionLocked: boolean;
  jitsiRoom?: string | null;
  meetMode?: string;
  jitsiPassword?: string | null;
}

export interface Registration {
  id: number;
  fullName: string;
  email: string;
  teamName: string;
  phone: string | null;
  memberCount: number;
  paymentMode: string;
  paymentStatus: string;
  notes: string | null;
  participantCode: string | null;
  createdAt: string;
  hackathonId: number | null;
  teamMembers: Array<{
    fullName: string;
    email: string;
    phone: string;
    college?: string;
    degree?: string;
    branch?: string;
    year?: string;
    city?: string;
  }> | null;
  projectInfo: {
    domain?: string;
    problemStatement?: string;
    title?: string;
    description?: string;
  } | null;
}

export interface Team {
  id: number;
  name: string;
  projectTitle: string;
  description: string | null;
  githubUrl: string | null;
  hackathonId: number | null;
  isFinalist: boolean;
  leader?: string;
  college?: string;
  track?: string;
  tagline?: string;
  about?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  verificationStatus?: string;
  registrationDate?: string;
  registrationId?: string;
  memberCount?: number;
}

export interface AdminStats {
  totalCodes: number;
  usedCodes: number;
  totalTeams: number;
  totalVotes: number;
  activeParticipants: number;
  currentPhase: string | null;
  activePollQuestion: string | null;
  totalJudges?: number;
  totalSubmissions?: number;
  totalJudgeScores?: number;
  linkedCodes?: number;
  activeTeams?: number;
  totalHackathons?: number;
  activeHackathon?: {
    id: number;
    name: string;
    phase: string;
    status: string;
  } | null;
}

export interface ActivityItem {
  id: string;
  type: "registration" | "team" | "score" | "poll" | "event" | "system";
  title: string;
  description?: string;
  timestamp: string;
  badge?: string;
}

export interface AdminLog {
  id: number;
  action: string;
  details: string | null;
  createdAt: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "core" | "operations";
  badge?: number;
}
