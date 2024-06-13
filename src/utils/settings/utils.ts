import { hasSettings, hasSettingsBannerlord } from '../vortex';

export const getSortOnDeployFromSettings = (state: object, profileId: string) => {
  if (!hasSettings(state)) {
    return null;
  }

  if (!hasSettingsBannerlord(state.settings)) {
    return null;
  }

  return state.settings.mountandblade2bannerlord?.sortOnDeploy?.[profileId];
};

export const getFixCommonIssuesFromSettings = (state: object, profileId: string) => {
  if (!hasSettings(state)) {
    return null;
  }

  if (!hasSettingsBannerlord(state.settings)) {
    return null;
  }

  return state.settings.mountandblade2bannerlord?.fixCommonIssues?.[profileId];
};

export const getBetaSortingFromSettings = (state: object, profileId: string) => {
  if (!hasSettings(state)) {
    return null;
  }

  if (!hasSettingsBannerlord(state.settings)) {
    return null;
  }

  return state.settings.mountandblade2bannerlord?.betaSorting?.[profileId];
};

export const getSaveFromSettings = (state: object, profileId: string) => {
  if (!hasSettings(state)) {
    return null;
  }

  if (!hasSettingsBannerlord(state.settings)) {
    return null;
  }

  let saveId = state.settings.mountandblade2bannerlord?.saveName?.[profileId] ?? null;
  if (saveId === 'No Save') {
    saveId = null;
  }

  return saveId;
};
