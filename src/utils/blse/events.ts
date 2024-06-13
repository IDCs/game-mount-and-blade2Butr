import { actions, selectors, types } from 'vortex-api';
import { hasSettingsInterfacePrimaryTool } from '../vortex';
import { GAME_ID } from '../../common';
import { LocalizationManager } from '../localization';
import { LoadOrderManager } from '../loadOrder';
import { findBLSEMod } from '.';

/**
 * Event function, be careful
 */
export const didDeployEvent = async (api: types.IExtensionApi, profileId: string) => {
  const { localize: t } = LocalizationManager.getInstance(api);

  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  if (profile.gameId !== GAME_ID) {
    return Promise.resolve();
  }

  try {
    const loadOrderManager = LoadOrderManager.getInstance(api);
    await loadOrderManager.deserializeLoadOrder();
  } catch (err) {
    api.showErrorNotification?.(t('Failed to deserialize load order file'), err);
  }

  return didDeployBLSE(api, state, profile);
};

const didDeployBLSE = async (api: types.IExtensionApi, state: types.IState, profile: types.IProfile) => {
  if (!hasSettingsInterfacePrimaryTool(state.settings.interface)) {
    return Promise.resolve();
  }

  const primaryTool = state.settings.interface.primaryTool.mountandblade2bannerlord;

  const blseMod = findBLSEMod(api);
  if (!!blseMod && !primaryTool) {
    api.store?.dispatch(actions.setPrimaryTool(profile.gameId, 'blse-cli'));
  }
  if (!blseMod && primaryTool === 'blse-cli') {
    api.store?.dispatch(actions.setPrimaryTool(profile.gameId, undefined!));
  }

  return Promise.resolve();
};

/**
 * Event function, be careful
 */
export const didPurgeEvent = async (api: types.IExtensionApi, profileId: string) => {
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  if (profile.gameId !== GAME_ID) {
    return Promise.resolve();
  }

  await didPurgeBLSE(api, state, profile);
};

const didPurgeBLSE = async (api: types.IExtensionApi, state: types.IState, profile: types.IProfile) => {
  if (!hasSettingsInterfacePrimaryTool(state.settings.interface)) {
    return Promise.resolve();
  }

  const primaryTool = state.settings.interface.primaryTool.mountandblade2bannerlord;
  if (primaryTool !== 'blse-cli') {
    return Promise.resolve();
  }

  const blseMod = findBLSEMod(api);
  if (blseMod) {
    api.store?.dispatch(actions.setPrimaryTool(profile.gameId, undefined!));
  }

  return Promise.resolve();
};
