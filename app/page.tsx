import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

function ReceiptIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8H8" />
      <path d="M16 12H8" />
      <path d="M12 16H8" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

function FeatureCard({ icon, title, body }: FeatureCardProps) {
  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg, 16px)",
        boxShadow: "var(--shadow-sm)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "var(--emerald-50)",
          color: "var(--emerald-500)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h3
          style={{
            fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
            fontSize: "1rem",
            fontWeight: 600,
            color: "var(--ink-900)",
            margin: 0,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-sans, 'Hanken Grotesk', sans-serif)",
            fontSize: "0.875rem",
            color: "var(--ink-500)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        fontFamily: "var(--font-sans, 'Hanken Grotesk', sans-serif)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          background: "var(--white)",
          borderBottom: "1px solid var(--line)",
          padding: "0 24px",
          height: "56px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
            fontWeight: 700,
            fontSize: "1.125rem",
            color: "var(--ink-900)",
            letterSpacing: "-0.02em",
          }}
        >
          xpense
        </span>
      </nav>

      {/* Hero */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 24px 48px",
          textAlign: "center",
          gap: "24px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-sans, 'Hanken Grotesk', sans-serif)",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--emerald-500)",
            margin: 0,
          }}
        >
          Personal expense tracker
        </p>

        <h1
          style={{
            fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "var(--ink-900)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            margin: 0,
            maxWidth: "520px",
          }}
        >
          Know where your money goes.
        </h1>

        <p
          style={{
            fontFamily: "var(--font-sans, 'Hanken Grotesk', sans-serif)",
            fontSize: "1.0625rem",
            color: "var(--ink-500)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: "440px",
          }}
        >
          Log expenses, track recurring costs, and see exactly how you spend —
          month by month.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="landing-cta"
          >
            <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px" }} aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </form>
      </section>

      {/* Feature cards */}
      <section
        style={{
          padding: "0 24px 64px",
          maxWidth: "960px",
          width: "100%",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}
      >
        <FeatureCard
          icon={<ReceiptIcon />}
          title="Expense tracking"
          body="Log every expense with amount, date, and category. Filter and review your history anytime."
        />
        <FeatureCard
          icon={<RepeatIcon />}
          title="Recurring templates"
          body="Set up monthly or annual expenses once — rent, subscriptions, insurance — and let them auto-generate."
        />
        <FeatureCard
          icon={<BarChartIcon />}
          title="Monthly & annual summaries"
          body="See spending by group each month and a full-year heatmap — so patterns become obvious."
        />
      </section>

      {/* Footer */}
      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--line-soft)",
          margin: "0 24px",
        }}
      />
      <footer
        style={{
          padding: "20px 24px",
          textAlign: "center",
          fontFamily: "var(--font-sans, 'Hanken Grotesk', sans-serif)",
          fontSize: "0.8125rem",
          color: "var(--ink-300)",
        }}
      >
        xpense · personal finance, honestly.
      </footer>
    </main>
  );
}
