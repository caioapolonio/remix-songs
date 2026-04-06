import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Privacy Policy — Remix Songs",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1 px-4 py-20">
        <div className="mx-auto max-w-3xl space-y-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-2 text-muted-foreground">
              Effective Date: April 6, 2026
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Introduction
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Remix Songs (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
              is a web-based audio player that lets you remix songs with
              real-time effects like slowed + reverb, nightcore, speed/pitch
              control, bass boost, and more. We are committed to protecting your
              privacy. This Privacy Policy explains what data we collect, how we
              use it, and your rights regarding your information. By using the
              Service, you agree to this Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Audio Processing
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              All audio processing happens entirely in your browser. We do not
              upload, store, or have access to any audio files you use with
              Remix Songs. Your music files never leave your device — effects
              are applied locally using Web Audio APIs, and exported files are
              downloaded directly to your computer.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Information We Collect
            </h2>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">
                Account & Authentication Data
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                When you create an account, we collect your email address and
                password. Your password is securely hashed — we never store it
                in plain text. Authentication is handled through Supabase.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">
                Payment & Subscription Data
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                When you purchase a Pro subscription, payment processing is
                handled by Stripe. We share your email address and user ID with
                Stripe to manage your subscription. We store your subscription
                status and Stripe customer reference in our database. We do not
                store or have access to your full credit card number.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">User Presets (Pro Only)</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you save effect presets, we store the preset name and
                associated settings (speed, reverb, bass boost, volume). Presets
                are private and only accessible to your account. A maximum of 10
                presets can be saved per user.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">What We Do Not Collect</h3>
              <p className="text-muted-foreground leading-relaxed">
                We do not use Google Analytics, tracking pixels, or any
                third-party analytics tools. We do not display advertisements.
                We do not collect browsing behavior, device fingerprints, or
                usage patterns beyond what is necessary to operate the Service.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              How We Use Your Information
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use collected information to:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Provide and operate the Service</li>
              <li>Authenticate your account and maintain your session</li>
              <li>Process payments and manage subscriptions</li>
              <li>Save and load your effect presets</li>
              <li>Respond to support inquiries</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Information Sharing
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell or rent your personal information. We only share
              data with the following service providers as necessary to operate
              the Service:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                <strong className="text-foreground">Supabase</strong> —
                Authentication and database hosting
              </li>
              <li>
                <strong className="text-foreground">Stripe</strong> — Payment
                processing and subscription management
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We may also disclose information to comply with legal obligations,
              enforce our terms, or prevent fraud and security threats.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Cookies & Tracking Technologies
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies solely for authentication and session management.
              These cookies are set by Supabase to keep you logged in. We do not
              use tracking cookies, advertising cookies, or analytics cookies.
              You can manage cookies through your browser settings, but
              disabling them may affect your ability to stay logged in.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use reasonable administrative, technical, and physical
              safeguards to protect your information. Payment data is managed
              solely by Stripe, a PCI-compliant payment processor.
              Authentication is handled securely through Supabase. While we take
              precautions, no method of transmission over the internet is
              completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Data Retention
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain personal data only as long as your account is active or
              as needed to provide the Service, comply with legal obligations,
              resolve disputes, and enforce agreements. You may request deletion
              of your account and associated data at any time by contacting us
              at{" "}
              <a
                href="mailto:support@remix-songs.com"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                support@remix-songs.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Your Rights
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your location (e.g., GDPR, CCPA), you may have the
              right to:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Access your personal data</li>
              <li>Correct inaccuracies in your data</li>
              <li>Request deletion of your data</li>
              <li>Restrict or object to processing</li>
              <li>Request a copy of your data (data portability)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:support@remix-songs.com"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                support@remix-songs.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Children&apos;s Privacy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for children under 13 years of age. We
              do not knowingly collect personal information from children under
              13. If you believe a child has provided us with personal data,
              please contact us and we will delete it promptly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Changes to This Privacy Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page, and the effective date at the top
              will be updated. Your continued use of the Service after any
              changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions or privacy-related requests, contact us
              at{" "}
              <a
                href="mailto:support@remix-songs.com"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                support@remix-songs.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
