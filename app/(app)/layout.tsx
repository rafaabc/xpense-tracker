import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppNav from "@/components/shared/AppNav";
import { ToastProvider } from "@/components/shared/Toast";
import "@/app/styles/app-shell.css";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

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

          <AppNav />

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
      <main className="app-main" style={{ maxWidth: 1024, margin: '0 auto', width: '100%', flex: 1, padding: '32px 24px' }}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </main>
    </div>
  );
}
