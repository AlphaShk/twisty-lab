import { BarChart3, Code2, Library, Settings } from 'lucide-react';
import { isDesktop, SOURCE_URL } from '../links';

export type View = 'learn' | 'library' | 'progress';

type SidebarProps = {
  view: View;
  onNavigate: (view: View) => void;
  onOpenSettings: () => void;
};

export function Sidebar({ view, onNavigate, onOpenSettings }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-mark" aria-label="Twisty Lab" title="Twisty Lab">
        <span>TL</span>
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <button
          className={view === 'library' || view === 'learn' ? 'active' : ''}
          onClick={() => onNavigate('library')}
        >
          <Library />
          <span>Library</span>
        </button>
        <button
          className={view === 'progress' ? 'active' : ''}
          onClick={() => onNavigate('progress')}
        >
          <BarChart3 />
          <span>Progress</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        {!isDesktop && (
          <a
            className="icon-button"
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Source code on GitHub"
            title="Source code on GitHub"
          >
            <Code2 />
          </a>
        )}
        <button
          className="icon-button"
          aria-label="Settings"
          title="Settings"
          onClick={onOpenSettings}
        >
          <Settings />
        </button>
      </div>
    </aside>
  );
}
