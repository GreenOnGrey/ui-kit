import { useCallback, useState, type ReactNode } from "react";
import { useKitT } from "../i18n";
import { Icon } from "./Icon";
import { useOutside } from "./ui";

/** The link of the product: the kit does not depend on a router (arch §4.2). */
export type LinkComponent = (props: {
  href: string; className?: string; onClick?: () => void; "aria-current"?: "page"; children: ReactNode;
}) => ReactNode;

export interface TopBarSection { key: string; label: ReactNode; href: string; active: boolean }

/** The top bar (FTR.NAB.CMN-0005 R5, design §4): the logo and the name, the
 * sections in a row and behind the burger on a phone, the actions of the product,
 * the avatar that opens the profile menu. The profile menu and the list of
 * sections are never open together. A part of the product with its own
 * navigation (the administration) puts it behind the burger in place of the
 * sections: `menu`, with the side panel marked `in-burger`, hidden on a phone. */
export function TopBar({ logo, name, home = "/", sections, Link, center, actions, avatar, profileMenu, menu }: {
  logo: string; name: string; home?: string; sections: TopBarSection[]; Link: LinkComponent;
  /** Between the sections and the actions: the search of Hammurapi. */
  center?: ReactNode;
  /** Before the avatar. */
  actions?: ReactNode;
  avatar: ReactNode;
  profileMenu: (close: () => void) => ReactNode;
  /** The burger of a phone in place of the sections: the navigation of the current part of the product and
   * its name, which the burger is called by. */
  menu?: { label: string; render: (close: () => void) => ReactNode };
}) {
  const t = useKitT();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const closeSections = useCallback(() => setSectionsOpen(false), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const ref = useOutside<HTMLDivElement>(sectionsOpen, closeSections);
  const links = sections.map((s) => (
    <Link key={s.key} href={s.href} className={s.active ? "on" : undefined} aria-current={s.active ? "page" : undefined} onClick={closeSections}>
      {s.label}
    </Link>
  ));
  return (
    <div className="topbar">
      <Link href={home} className="brand">
        <img src={logo} alt="" />
        <span className="hide-m">{name}</span>
      </Link>
      <nav className="nav hide-m" aria-label={t("topbar.sections")}>{links}</nav>
      {center}
      <div className="top-actions">
        {actions}
        <button className="avatar" style={profileOpen ? { boxShadow: "0 0 0 2px var(--violet)" } : undefined}
          onClick={() => { setSectionsOpen(false); setProfileOpen((v) => !v); }} aria-label={t("topbar.profile")} aria-expanded={profileOpen}>
          {avatar}
        </button>
        <div className="burger" ref={ref}>
          <button className={`iconbtn${sectionsOpen ? " on" : ""}`} onClick={() => { setProfileOpen(false); setSectionsOpen((v) => !v); }}
            aria-label={menu?.label ?? t("topbar.sections")} aria-expanded={sectionsOpen} aria-controls="nav-sections">
            <Icon name={sectionsOpen ? "x" : "menu"} />
          </button>
          {sectionsOpen && (menu
            ? <div id="nav-sections" className="navmenu">{menu.render(closeSections)}</div>
            : <nav id="nav-sections" className="navmenu" aria-label={t("topbar.sections")}>{links}</nav>)}
        </div>
      </div>
      {profileOpen && profileMenu(closeProfile)}
    </div>
  );
}
