type HeaderProps = {
  eyebrow: string;
  title: string;
  /** Share of cases marked learned, in percent. */
  coverage: number;
};

export function Header({ eyebrow, title, coverage }: HeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="progress-summary">
        <span>Cases learned</span>
        <b>{coverage}%</b>
        <div className="progress-track">
          <i style={{ width: `${coverage}%` }} />
        </div>
      </div>
    </header>
  );
}
