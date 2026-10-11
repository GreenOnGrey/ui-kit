import type { ReactNode } from "react";

export interface LoginLanguage { code: string; label: string; active: boolean }

/** The sign-in screen (FTR.NAB.CMN-0005 R6, design §5): dark in both themes, the
 * logo, the name in capitals, the motto, one button of the provider of the
 * deployment, the languages. The texts and the logo are of the product. */
export function LoginScreen({ logo, logoAlt, name, tagline, signIn, note, error, languages, onLanguage }: {
  logo: string; logoAlt: string; name: string; tagline: ReactNode;
  signIn: { href: string; label: ReactNode; icon: ReactNode };
  note?: ReactNode; error?: ReactNode;
  languages: LoginLanguage[]; onLanguage: (code: string) => void;
}) {
  return (
    <div className="login">
      <div className="box">
        <img src={logo} alt={logoAlt} />
        <h1>{name}</h1>
        <div className="tag">{tagline}</div>
        <a className="btn primary" href={signIn.href}>
          {signIn.icon}
          {signIn.label}
        </a>
        {note && <div className="sub">{note}</div>}
        {error && <div className="err-text" role="alert">{error}</div>}
        <div className="chips">
          {languages.map((l) => (
            <button key={l.code} lang={l.code} className={`chip${l.active ? " on" : ""}`} onClick={() => onLanguage(l.code)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
