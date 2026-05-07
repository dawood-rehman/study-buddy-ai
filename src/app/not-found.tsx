import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
      <h1 className="mb-3 font-display text-5xl font-bold text-foreground">404</h1>
      <p className="mb-5 text-muted-foreground">This page does not exist.</p>
      <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Return home
      </Link>
    </div>
  );
}
