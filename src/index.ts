// eslint-disable-next-line no-restricted-imports
import Bluebird, { Promise, method as toBluebird } from 'bluebird';
import { log, selectors, types } from 'vortex-api';
import { TFunction } from 'vortex-api/lib/util/i18n';
import { ICollection } from '@nexusmods/nexus-api';
import path from 'path';
import {
  actionsSettings,
  addedFilesEvent,
  didDeployEvent,
  didPurgeEvent,
  genCollectionsData,
  getInstallPathBLSE,
  getInstallPathModule,
  hasCollection,
  IBannerlordCollections,
  installBLSE,
  isModTypeBLSE,
  isModTypeModule,
  LoadOrderManager,
  parseCollectionsData,
  reducer,
  SaveManager,
  testBLSE,
  VortexLauncherManager,
} from './utils';
import { GAME_ID } from './common';
import {
  BannerlordDataView,
  BannerlordModOptionsView,
  SavePage,
  SavePageOptions,
  Settings,
  SettingsProps,
} from './views';
import { BannerlordGame } from './game';
import { IAddedFiles } from './types';
import { version } from '../package.json';

const main = (context: types.IExtensionContext): boolean => {
  log('info', `Extension Version: ${version}`);

  context.registerReducer(/*path:*/ [`settings`, GAME_ID], /*spec:*/ reducer);

  context.registerSettings(
    /*title:*/ `Interface`,
    /*element:*/ Settings,
    /*props?:*/ (): SettingsProps => ({
      onSetSortOnDeploy: (profileId: string, sort: boolean) =>
        context.api.store?.dispatch(actionsSettings.setSortOnDeploy(profileId, sort)),
      onSetFixCommonIssues: (profileId: string, fixCommonIssues: boolean) =>
        context.api.store?.dispatch(actionsSettings.setFixCommonIssues(profileId, fixCommonIssues)),
      onSetBetaSorting: (profileId: string, betaSorting: boolean) =>
        context.api.store?.dispatch(actionsSettings.setBetaSorting(profileId, betaSorting)),
    }),
    /*visible?:*/ () => {
      return selectors.activeGameId(context.api.getState()) === GAME_ID;
    },
    /*priority?:*/ 51
  );

  context.registerGame(new BannerlordGame(context.api));

  if (hasCollection(context.optional)) {
    context.optional.registerCollectionFeature(
      /*id:*/ `${GAME_ID}_load_order`,
      /*generate:*/ toBluebird(async (gameId: string, includedMods: string[]) => {
        if (GAME_ID !== gameId) {
          return [];
        }
        return genCollectionsData(context.api, includedMods);
      }),
      /*parse:*/ toBluebird(async (gameId: string, collection: ICollection) => {
        if (GAME_ID !== gameId) {
          return;
        }
        const coll = collection as IBannerlordCollections;
        return await parseCollectionsData(context.api, coll);
      }),
      /*clone:*/ toBluebird(async (gameId: string, _collection: ICollection, _from: types.IMod, _to: types.IMod) => {
        if (GAME_ID !== gameId) {
          return;
        }

        return;
      }),
      /*title:*/ (t: TFunction) => {
        return t(`Bannerlord Data`);
      },
      /*condition?:*/ (_state: types.IState, gameId: string) => {
        return gameId === GAME_ID;
      },
      /*editComponent?:*/ BannerlordDataView
    );

    // context.optional.registerCollectionFeature(
    //   /*id:*/ `${GAME_ID}_mod_options`,
    //   /*generate:*/ toBluebird(async (gameId: string, includedMods: string[]) => {
    //     if (GAME_ID !== gameId) {
    //       return [];
    //     }
    //     return genCollectionsData(context.api, includedMods);
    //   }),
    //   /*parse:*/ toBluebird(async (gameId: string, collection: ICollection) => {
    //     if (GAME_ID !== gameId) {
    //       return;
    //     }
    //     const coll = collection as IBannerlordCollections;
    //     return await parseCollectionsData(context.api, coll);
    //   }),
    //   /*clone:*/ toBluebird(async (gameId: string, _collection: ICollection, _from: types.IMod, _to: types.IMod) => {
    //     if (GAME_ID !== gameId) {
    //       return;
    //     }

    //     return;
    //   }),
    //   /*title:*/ (t: TFunction) => {
    //     return t(`Bannerlord Mod Options`);
    //   },
    //   /*condition?:*/ (_state: types.IState, gameId: string) => {
    //     return gameId === GAME_ID;
    //   },
    //   /*editComponent?:*/ BannerlordModOptionsView
    // );
  }

  context.registerLoadOrder(/*gameInfo:*/ LoadOrderManager.getInstance(context.api));

  context.registerMainPage(
    /*icon:*/ 'savegame',
    /*title:*/ 'Saves',
    /*element:*/ SavePage,
    /*options:*/ new SavePageOptions(context)
  );

  context.registerInstaller(
    /*id:*/ 'bannerlord-blse-installer',
    /*priority:*/ 30,
    /*testSupported:*/ toBluebird(testBLSE),
    /*install:*/ toBluebird((files: string[]) => installBLSE(context.api, files))
  );
  context.registerModType(
    /*id:*/ 'bannerlord-blse',
    /*priority:*/ 30,
    /*isSupported:*/ (gameId) => gameId === GAME_ID,
    /*getPath:*/ (game) => getInstallPathBLSE(context.api, game),
    /*test:*/ toBluebird(isModTypeBLSE)
  );

  context.registerInstaller(
    /*id:*/ `bannerlord-module-installer`,
    /*priority:*/ 25,
    /*testSupported:*/ toBluebird(async (files: string[], gameId: string) => {
      const launcherManager = VortexLauncherManager.getInstance(context.api);
      return await launcherManager.testModule(files, gameId);
    }),
    /*install:*/ toBluebird(async (files: string[], destinationPath: string) => {
      const launcherManager = VortexLauncherManager.getInstance(context.api);
      return await launcherManager.installModule(files, destinationPath);
    })
  );
  context.registerModType(
    /*id:*/ 'bannerlord-module',
    /*priority:*/ 25,
    /*isSupported:*/ (gameId) => gameId === GAME_ID,
    /*getPath:*/ (game) => getInstallPathModule(context.api, game),
    /*test:*/ toBluebird(isModTypeModule)
  );

  context.registerAction(
    /*group:*/ `fb-load-order-icons`,
    /*position:*/ 200,
    /*iconOrComponent:*/ `loot-sort`,
    /*options:*/ {},
    /*titleOrProps?:*/ `Auto Sort`,
    /*actionOrCondition?:*/ (_instanceIds?: string[]): boolean | void => {
      const launcherManager = VortexLauncherManager.getInstance(context.api);
      launcherManager.autoSort();
    },
    /*condition?:*/ (_instanceIds?: string[]): boolean => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );

  /* Disabled for now because the name is too long
  context.registerAction(
    `fb-load-order-icons`,
    201,
    `changelog`,
    {},
    `Fetch Compatibility Scores`,
    (_instanceIds?: string[]): boolean | void => {
      const loadOrderManager = LoadOrderManager.getInstance(context.api);
      loadOrderManager.updateCompatibilityScores();
    },
    (_instanceIds?: string[]): boolean => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  */

  // Register Callbacks
  context.once(
    toBluebird<void>(async () => {
      context.api.setStylesheet('savegame', path.join(__dirname, 'savegame.scss'));

      context.api.events.on('gamemode-activated', async (gameId: string) => {
        if (GAME_ID !== gameId) {
          return;
        }
        try {
          const loadOrderManager = LoadOrderManager.getInstance(context.api);
          await loadOrderManager.deserializeLoadOrder();
        } catch (err) {
          context.api.showErrorNotification?.('Failed to deserialize load order file', err);
          return;
        }
        try {
          const saveManager = SaveManager.getInstance(context.api);
          saveManager.reloadSave();
        } catch (err) {
          context.api.showErrorNotification?.('Failed to reload the currect save file', err);
          return;
        }
      });

      /*
      // TODO: Provide compatibility info for Game Version -> Mod Version from the BUTR Site
      const proxy = new ModAnalyzerProxy(context.api);
      context.api.addMetaServer(`butr.link`, {
        url: '',
        loopbackCB: (query: types.IQuery) =>
          Bluebird.resolve(proxy.find(query)).catch((err) => {
            log('error', 'failed to look up butr meta info', err.message);
            return Bluebird.resolve([]);
          }),
        cacheDurationSec: 86400,
        priority: 25,
      });
      */

      context.api.onAsync(`added-files`, (profileId: string, files: IAddedFiles[]) =>
        addedFilesEvent(context.api, profileId, files)
      );

      // TODO: lister to profile switch events and check for BLSE
      // Set BLSE CLI as primary tool on deployment if no primary tool is set
      context.api.onAsync('did-deploy', (profileId: string) => didDeployEvent(context.api, profileId));
      // Remove BLSE CLI as primary tool on purge if it is set
      context.api.onAsync('did-purge', (profileId: string) => didPurgeEvent(context.api, profileId));
    })
  );
  // Register Callbacks

  return true;
};

export default main;
