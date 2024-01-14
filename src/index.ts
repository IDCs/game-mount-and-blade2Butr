import Bluebird, { Promise, method as toBluebird } from 'bluebird';
import path from 'path';
import { actions, selectors, types, util } from 'vortex-api';
import { setCurrentSave, setSortOnDeploy } from './actions';
import { GAME_ID } from './common';
import { BannerlordGame } from './game';
import { LoadOrderManager, VortexLauncherManager, getInstallPathModule, isModTypeModule, isModTypeBLSE, getInstallPathBLSE, testBLSE, installBLSE, didDeployBLSE, didPurgeBLSE, addedFiles } from './utils';
import { SaveList, SavePageOptions, Settings } from './views';
import { IAddedFiles } from './types';

const main = (context: types.IExtensionContext): boolean => {
  const launcherManager = new VortexLauncherManager(context.api);
  
  // Register Settings
  const reducer: types.IReducerSpec = {
    reducers: {
      [setSortOnDeploy as any]: (state, payload) =>
        util.setSafe(state, [`sortOnDeploy`, payload.profileId], payload.sort),
      [actions.setLoadOrder as any]: (state, payload) => util.setSafe(state, [payload.id], payload.order),
      [setCurrentSave as any]: (state, payload) => util.setSafe(state, [`saveList`], payload),
    },
    defaults: {
      sortOnDeploy: {},
    },
  };

  context.registerReducer([`settings`, `mountandblade2`], reducer);

  const settingsOnSetSortOnDeploy = (profileId: string, sort: boolean) => context.api.store?.dispatch(setSortOnDeploy(profileId, sort));
  const settingsProps = () => ({ t: context.api.translate, onSetSortOnDeploy: settingsOnSetSortOnDeploy });
  const settingsVisible = () => selectors.activeProfile(context.api.getState()).gameId === GAME_ID;
  context.registerSettings(
    `Interface`,
    Settings,
    settingsProps,
    settingsVisible,
    51
  );
  // Register Settings

  // Register Game
  context.registerGame(new BannerlordGame(context.api, launcherManager));

  /*
  // Register Collection Feature
  const collectionFeature: IExtensionContextCollectionFeature = context.optional;
  if (collectionFeature.registerCollectionFeature) {
    collectionFeature.registerCollectionFeature(
      `mountandblade2_collection_data`,
      (gameId: string, includedMods: string[]) => genCollectionsData(context, gameId, includedMods),
      (gameId: string, collection: ICollection) => parseCollectionsData(context, gameId, collection as ICollectionMB),
      () => Promise.resolve(),
      (t: TFunction) => t(`Mount and Blade 2 Data`),
      (_state: types.IState, gameId: string) => gameId === GAME_ID,
      CollectionsDataView as React.ComponentType<IExtendedInterfaceProps>,
    );
  }
  */

  context.registerLoadOrder(new LoadOrderManager(context.api, launcherManager));

  context.registerMainPage('savegame', 'Saves', SaveList, new SavePageOptions(context, launcherManager));

  // Register Installer.
  context.registerInstaller('bannerlord-blse-installer', 30, testBLSE, (files, destinationPath) => installBLSE(context.api, files, destinationPath));
  context.registerModType('bannerlord-blse', 30, gameId => gameId === GAME_ID, game => getInstallPathBLSE(context.api, game), isModTypeBLSE);
  
  context.registerInstaller(`bannerlord-module-installer`, 25, launcherManager.testModule, launcherManager.installModule);
  context.registerModType('bannerlord-module', 25, gameId => gameId === GAME_ID, game => getInstallPathModule(context.api, game), isModTypeModule);
  // Register Installer.


  // Register AutoSort button
  const autoSortIcon = launcherManager.isSorting() ? `spinner` : `loot-sort`;
  const autoSortAction = (_instanceIds?: string[]): boolean | void => launcherManager.autoSort();
  const autoSortCondition = (): boolean => selectors.activeGameId(context.api.getState()) === GAME_ID;
  context.registerAction(
    `fb-load-order-icons`,
    200,
    autoSortIcon,
    {},
    `Auto Sort`,
    autoSortAction,
    autoSortCondition
  );
  // Register AutoSort button

  // Register Callbacks
  context.once(toBluebird<void>(async () => {
    context.api.setStylesheet('savegame', path.join(__dirname, 'savegame.scss'));

    /* TODO: Provide compatibility info for Game Version -> Mod Version from the BUTR Site
    const proxy = new BUTRProxy(context.api);
    context.api.addMetaServer(`butr.site`, {
      url: '',
      loopbackCB: (query: types.IQuery) => Bluebird.resolve(proxy.find(query)).catch(err => {
        log('error', 'failed to look up smapi meta info', err.message);
        return Bluebird.resolve([]);
      }),
      cacheDurationSec: 86400,
      priority: 25,
    });
    */

    context.api.onAsync(`added-files`, (profileId: string, files: IAddedFiles[]) => addedFiles(context.api, profileId, files));

    // TODO: lister to profile switch events and check for BLSE
    // Set BLSE CLI as primary tool on deployment if no primary tool is set
    context.api.onAsync('did-deploy', (profileId: string) => didDeployBLSE(context.api, profileId));
    // Remove BLSE CLI as primary tool on purge if it is set
    context.api.onAsync('did-purge', (profileId: string) => didPurgeBLSE(context.api, profileId));
  }));
  // Register Callbacks

  return true;
};

export default main;