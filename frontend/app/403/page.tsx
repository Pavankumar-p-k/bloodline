import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">403</h1>
        <p className="mt-2 text-xl font-semibold text-gray-800">Access denied</p>
        <p className="mt-1 text-sm text-gray-500">
          You do not have permission to view this page.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
