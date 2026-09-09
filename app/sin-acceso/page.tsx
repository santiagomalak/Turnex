import Link from 'next/link'

export default function SinAccesoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Sin acceso</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Tu usuario no tiene permiso para ver esta sección. Si creés que es un error,
          pedile a un administrador que revise tu rol.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-6 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm dark:bg-white dark:text-zinc-900"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
