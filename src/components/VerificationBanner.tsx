import { Check, X } from 'lucide-react';
import type { VerificationResult } from '../cube';

export function VerificationBanner({ result }: { result: VerificationResult }) {
  return (
    <div
      className={`verification-result ${result.correct ? 'correct' : 'incorrect'}`}
      role="status"
    >
      {result.correct ? <Check /> : <X />}
      <div>
        <b>{result.correct ? 'Correct for this OLL case' : 'Not correct for this case'}</b>
        <span>{result.message}</span>
        {result.detail && <span>Parser message: {result.detail}</span>}
      </div>
      {result.syntaxValid && <small>{result.moveCount} moves</small>}
    </div>
  );
}
