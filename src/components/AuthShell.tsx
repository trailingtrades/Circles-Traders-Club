import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="mb-6">
        <Logo size="text-2xl" />
      </div>
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-xs text-ink-400">
        © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || "Circles Traders Club"}. All rights reserved.
      </p>
    </main>
  );
}
