import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <p>&copy; {new Date().getFullYear()} Remix Songs. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy-policy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <span className="text-border">|</span>
          <a
            href="mailto:support@remix-songs.com"
            className="underline underline-offset-4 hover:text-foreground"
          >
            support@remix-songs.com
          </a>
        </div>
      </div>
    </footer>
  );
}
