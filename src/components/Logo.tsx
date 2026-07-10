export default function Logo({ size = "text-xl" }: { size?: string }) {
  const name = process.env.NEXT_PUBLIC_APP_NAME || "Circles Traders Club";
  return (
    <span className={`font-extrabold tracking-tight ${size}`}>
      <span className="text-brand-500">●</span>{" "}
      <span className="text-ink-900 dark:text-white">{name}</span>
    </span>
  );
}
