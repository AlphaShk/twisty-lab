import { Check, X } from 'lucide-react';
import {
  CUBING_SOURCE_URL,
  CUBING_URL,
  isDesktop,
  JPERM_URL,
  LICENSES_URL,
  LUCIDE_URL,
  SOURCE_URL,
} from '../links';

const external = { target: '_blank', rel: 'noreferrer' } as const;

export function SettingsDialog({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">TWISTY LAB</p>
            <h2>Settings</h2>
          </div>
          <button aria-label="Close settings" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="setting-row">
          <div>
            <b>Local-first</b>
            <span>
              Learning statuses, notes, preferred algorithms, and verification results stay on this
              device.
            </span>
          </div>
          <span className="offline-badge">
            <Check /> Local
          </span>
        </div>
        <div className="setting-row">
          <div>
            <b>Verification model</b>
            <span>
              An algorithm passes when OLL is oriented and F2L stays solved. A U turn before it, any
              PLL outcome and a final AUF are accepted.
            </span>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <b>Credits</b>
            <span>
              Alternative algorithms, shape-group names and most curated defaults from{' '}
              <a href={JPERM_URL} {...external}>
                JPerm
              </a>
              . Cube model and player by{' '}
              <a href={CUBING_URL} {...external}>
                cubing.js
              </a>{' '}
              (MPL-2.0, source:{' '}
              <a href={CUBING_SOURCE_URL} {...external}>
                github.com/cubing/cubing.js
              </a>
              ). Icons by{' '}
              <a href={LUCIDE_URL} {...external}>
                Lucide
              </a>
              .{' '}
              {!isDesktop && (
                <>
                  <a href={LICENSES_URL} {...external}>
                    Third-party licences
                  </a>
                  .{' '}
                </>
              )}
              <a href={SOURCE_URL} {...external}>
                Source code
              </a>{' '}
              under the MIT license.
            </span>
          </div>
        </div>
        <button className="reset-button" onClick={onReset}>
          Reset local data
        </button>
      </section>
    </div>
  );
}
