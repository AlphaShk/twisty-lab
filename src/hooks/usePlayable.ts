import { useEffect, useState } from 'react';
import { isPlayable } from '../cube';

/** Whether `algorithm` parses and only uses 3x3x3 moves (checked asynchronously). */
export function usePlayable(algorithm: string) {
  const [playable, setPlayable] = useState(true);
  useEffect(() => {
    let current = true;
    isPlayable(algorithm).then((value) => {
      if (current) setPlayable(value);
    });
    return () => {
      current = false;
    };
  }, [algorithm]);
  return playable;
}
