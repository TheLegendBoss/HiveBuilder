import { session } from '../core/session';
import { SceneKeys, type SceneKey } from './keys';

/** Where a loaded campaign picks up: on the map if the squad is out, otherwise at the HQ. */
export function resumeKey(): SceneKey {
  return session.expedition ? SceneKeys.Expedition : SceneKeys.Hub;
}
