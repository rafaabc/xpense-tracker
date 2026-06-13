import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <p className="text-zinc-500">
        Welcome, {session?.user?.name ?? "there"}. Your expense tracker is
        ready — add groups and subcategories to get started.
      </p>
    </div>
  );
}
