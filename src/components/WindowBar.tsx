import { Minus, Square, X } from 'lucide-react';

/** Title bar of the Electron window: macOS draws its traffic lights, other platforms get buttons. */
export function WindowBar() {
  const desktop = window.desktop;
  return (
    <div className="window-bar">
      <div className="window-drag-region">
        <div className="window-brand">
          <span className="cube-glyph">
            <i />
            <i />
            <i />
          </span>
          Twisty Lab
        </div>
        <span className="window-context">OLL algorithm workbench</span>
      </div>
      {desktop && desktop.platform !== 'darwin' && (
        <div className="window-controls">
          <button aria-label="Minimize" onClick={() => desktop.minimize()}>
            <Minus size={14} />
          </button>
          <button aria-label="Maximize" onClick={() => desktop.maximize()}>
            <Square size={11} />
          </button>
          <button className="close" aria-label="Close" onClick={() => desktop.close()}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
