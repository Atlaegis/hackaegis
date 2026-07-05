import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-transparent to-purple-900/20" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
              Transparent Innovation Operating System
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Where Every Evaluation Is{" "}
              <span className="text-orange-400">Transparent</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl">
              The only hackathon platform that tells you <strong>why</strong> you
              were eliminated — with score breakdowns, judge feedback, and
              actionable improvement suggestions.
            </p>
            <div className="mt-10 flex items-center gap-x-4">
              <Link
                href="/sign-up"
                className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-orange-400 transition-colors"
              >
                Register Now — ₹99
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              >
                How it works →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why HackAegis */}
      <section id="how-it-works" className="bg-gray-950 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            Why HackAegis?
          </h2>
          <p className="mt-4 text-center text-gray-400 max-w-2xl mx-auto">
            Most hackathons tell you &quot;Rejected.&quot; We tell you why — and
            how to improve.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Score Breakdown"
              description="See exactly how you scored on each criterion — Innovation, Technical, UI/UX, Business, and Presentation."
              icon="📊"
            />
            <FeatureCard
              title="Judge Feedback"
              description="Mandatory detailed feedback from every judge. Strengths, weaknesses, and recommendations — no black boxes."
              icon="💬"
            />
            <FeatureCard
              title="Elimination Reasons"
              description="If you're eliminated, you'll know exactly why. Judges must provide specific, actionable reasons."
              icon="🎯"
            />
            <FeatureCard
              title="Evaluation Timeline"
              description="Track your progress from submission to final results. Know where you stand at every stage."
              icon="📈"
            />
            <FeatureCard
              title="Fair & Audited"
              description="Every judge action is logged in an immutable audit trail. No hidden decisions, no unexplained overrides."
              icon="🔒"
            />
            <FeatureCard
              title="Learn & Grow"
              description="Use feedback from one hackathon to win the next. Your journey is tracked, your growth is visible."
              icon="🚀"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-black py-20 border-t border-gray-800">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-white">
            How It Works
          </h2>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard step={1} title="Register & Pay" description="Sign up, complete your profile, form a team." />
            <StepCard step={2} title="Build & Submit" description="Choose a problem statement, build your solution, submit links." />
            <StepCard step={3} title="Get Evaluated" description="Expert judges review with a structured rubric and mandatory feedback." />
            <StepCard step={4} title="See Everything" description="View your scores, feedback, and learn from detailed elimination reasons." />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-950 py-20 border-t border-gray-800">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-white">FAQ</h2>
          <div className="mt-12 space-y-6">
            <FaqItem
              question="What makes HackAegis different from other hackathon platforms?"
              answer="Transparency. Every other platform just tells you 'Rejected.' We show you the exact score breakdown, judge comments, and specific reasons for elimination. You actually learn from participating."
            />
            <FaqItem
              question="How much does it cost to participate?"
              answer="₹99 per participant. This covers platform access, detailed evaluation feedback, and participation certificate."
            />
            <FaqItem
              question="What's the team size?"
              answer="Teams of 2-4 members. You can create a team and invite others, or join an existing team using an invite code."
            />
            <FaqItem
              question="Can judges reject without giving a reason?"
              answer="No. Our system enforces mandatory feedback. Judges must provide detailed strengths, weaknesses, and specific elimination reasons before they can submit any evaluation."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-sm text-gray-500">
            © 2025 HackAegis. Build. Compete. Get Recognized.
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <span className="text-2xl">{icon}</span>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
        {step}
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-5">
      <h3 className="text-base font-semibold text-white">{question}</h3>
      <p className="mt-2 text-sm text-gray-400 leading-relaxed">{answer}</p>
    </div>
  );
}
