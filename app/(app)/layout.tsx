import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const navLinkStyle = {
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--ink-700)',
    textDecoration: 'none',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
  } as const

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', background: 'var(--paper)' }}>
      <header
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--white)',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            height: 56,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'var(--text-md)',
              color: 'var(--ink-900)',
              marginRight: 8,
            }}
          >
            xpense
          </span>

          <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
            <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
            <Link href="/expenses" style={navLinkStyle}>Expenses</Link>
            <Link href="/categories" style={navLinkStyle}>Categories</Link>
            <Link href="/settings" style={navLinkStyle}>Settings</Link>
          </nav>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--ink-500)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 10px',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main style={{ maxWidth: 1024, margin: '0 auto', width: '100%', flex: 1, padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  );
}
