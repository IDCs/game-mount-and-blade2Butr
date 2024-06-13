// eslint-disable-next-line no-restricted-imports
import Bluebird from 'bluebird';
import { fs, log, selectors, types, util } from 'vortex-api';
import path from 'path';
import { GAME_ID } from '../common';
import { IAddedFiles } from '../types';

/**
 * Event function, be careful
 */
export const addedFilesEvent = async (
  api: types.IExtensionApi,
  profileId: string,
  files: IAddedFiles[]
): Promise<void> => {
  const state = api.getState();

  const profile = selectors.profileById(state, profileId);
  if (profile.gameId !== GAME_ID) {
    return;
  }

  const discovery: types.IDiscoveryResult | undefined = selectors.discoveryByGame(state, profile.gameId);
  if (!discovery?.path) {
    // Can't do anything without a discovery path.
    return;
  }

  const game = util.getGame(profile.gameId);
  const modPaths = game.getModPaths ? game.getModPaths(discovery.path) : {};
  const installPath: string = selectors.installPathForGame(state, game.id);

  await Bluebird.map(files, async (entry: { filePath: string; candidates: string[] }) => {
    // only act if we definitively know which mod owns the file
    if (entry.candidates.length === 1) {
      const mod = state.persistent.mods[game.id]?.[entry.candidates[0]!];
      if (!mod) {
        return;
      }
      const relPath = path.relative(modPaths[mod.type ?? ``]!, entry.filePath);
      const targetPath = path.join(installPath, mod.id, relPath);
      // copy the new file back into the corresponding mod, then delete it.
      //  That way, vortex will create a link to it with the correct
      //  deployment method and not ask the user any questions
      await fs.ensureDirAsync(path.dirname(targetPath));

      // Remove the target destination file if it exists.
      //  this is to completely avoid a scenario where we may attempt to
      //  copy the same file onto itself.
      await fs.removeAsync(targetPath);
      try {
        await fs.copyAsync(entry.filePath, targetPath);
        await fs.removeAsync(entry.filePath);
      } catch (err) {
        if (err instanceof Error) {
          log(`error`, `failed to import added file to mod`, err.message);
        }
      }
    }
  });
};
