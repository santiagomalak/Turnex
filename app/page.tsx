import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col items-center gap-8 py-24 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Turnex
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Sistema de gestión para complejo deportivo — canchas, socios y
            cobros en un solo lugar.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Demo en construcción — todavía sin datos reales.
          </p>
        </div>

        <nav className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-48 items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            href="/personas"
          >
            Personas
          </Link>
          <Link
            className="flex h-12 w-48 items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            href="/espacios"
          >
            Espacios
          </Link>
        </nav>
      </main>
    </div>
  );
}
