import { ArrowRight, Database, LockKeyhole, Search, ShieldCheck, Sparkles } from "lucide-react";
import { loginAction } from "@/app/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const message =
    params.error === "unauthorized"
      ? "Ez az e-mail-cím nincs engedélyezve."
      : params.error === "invalid"
        ? "Hibás e-mail vagy jelszó."
        : null;

  return (
    <main className="login-page">
      <section className="login-showcase" aria-label="Leadgyűjtő áttekintés">
        <div className="login-brand">
          <div className="login-brand-mark">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="login-brand-title">Leadgyűjtő</p>
            <p className="login-brand-subtitle">Privát adatgyűjtő rendszer</p>
          </div>
        </div>

        <div className="login-hero-copy">
          <span className="login-kicker">
            <Sparkles className="size-4" aria-hidden="true" />
            Google Places alapú leadgyűjtés
          </span>
          <h1>Tiszta adatbázis. Kezelhető keresések. Exportálható leadek.</h1>
          <p>
            Egyetlen felhasználóra zárt adminfelület, háttérben futó keresésekkel, e-mail-kinyeréssel és szigorú API-kvótával.
          </p>
        </div>

        <div className="login-preview" aria-hidden="true">
          <div className="login-preview-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="login-preview-header">
            <div>
              <p className="login-preview-eyebrow">Mai gyűjtés</p>
              <strong>42 új vállalkozás</strong>
            </div>
            <Search className="size-5" />
          </div>
          <div className="login-preview-stats">
            <div>
              <span>Mentve</span>
              <strong>128</strong>
            </div>
            <div>
              <span>E-mail</span>
              <strong>76</strong>
            </div>
            <div>
              <span>Kvóta</span>
              <strong>812</strong>
            </div>
          </div>
          <div className="login-preview-list">
            {["Fogászat Budapest", "Könyvelőiroda Győr", "Étterem Szeged"].map((item) => (
              <div key={item}>
                <Database className="size-4" />
                <span>{item}</span>
                <em>kész</em>
              </div>
            ))}
          </div>
        </div>

        <div className="login-trust-row">
          {["Auth", "RLS", "Worker"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="login-form-zone">
        <div className="login-mobile-brand">
          <div className="login-brand-mark">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="login-brand-title">Leadgyűjtő</p>
            <p className="login-brand-subtitle">Privát munkafelület</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <div className="login-lock">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </div>
            <h2>Belépés</h2>
            <p>Csak az engedélyezett felhasználó fér hozzá az adatokhoz.</p>
          </div>

          {message ? <p className="login-error">{message}</p> : null}

          <form action={loginAction} className="login-form">
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
            <label>
              <span>E-mail</span>
              <input name="email" type="email" autoComplete="email" placeholder="owner@example.com" required />
            </label>
            <label>
              <span>Jelszó</span>
              <input name="password" type="password" autoComplete="current-password" placeholder="••••••••••••" required />
            </label>
            <button>
              Belépés
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
