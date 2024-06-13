import { actions, selectors, types, util } from 'vortex-api';
import { GAME_ID } from '../../common';
import { IBannerlordMod, IModuleCache, VortexLoadOrderStorage } from '../../types';
import { persistenceToVortex } from '../loadOrder';
import { CollectionParseError, IBannerlordCollections } from '.';

const isValidMod = (mod: types.IMod) => {
  return mod !== undefined && mod.type !== 'collection';
};

const isModInCollection = (collectionMod: types.IMod, mod: IBannerlordMod) => {
  if (collectionMod.rules === undefined) {
    return false;
  }

  return collectionMod.rules.find((rule) => util.testModReference(mod, rule.reference)) !== undefined;
};

export const genCollectionLoadOrder = (
  loadOrder: VortexLoadOrderStorage,
  mods: IBannerlordMod[],
  collectionMod?: types.IMod
): VortexLoadOrderStorage => {
  // We get the current load order the user has
  // And the mods that are tied to the collection
  // And we return the load order with the mods that are in the collection
  const filteredLoadOrder = loadOrder
    .filter((entry) => {
      if (!entry.modId) {
        // We add the non existent LO entries as optionals
        return entry.data ? entry.enabled : false;
      }

      const mod = mods.find((x) => x.attributes?.modId === parseInt(entry.modId ?? '0'));
      if (!mod) {
        return false;
      }

      if (collectionMod) {
        return isValidMod(mod) && isModInCollection(collectionMod, mod);
      }

      return isValidMod(mod);
    })
    .reduce<VortexLoadOrderStorage>((accum, iter) => {
      accum.push(iter);
      return accum;
    }, []);
  return filteredLoadOrder;
};

export const parseCollectionLoadOrder = (
  api: types.IExtensionApi,
  modules: Readonly<IModuleCache>,
  collection: IBannerlordCollections
) => {
  const state = api.getState();

  const profileId = selectors.lastActiveProfileForGame(state, GAME_ID);
  if (!profileId) {
    throw new CollectionParseError(collection.name || '', 'Invalid profile id');
  }

  const loadOrder = persistenceToVortex(api, modules, collection.loadOrder);
  api.store?.dispatch(actions.setLoadOrder(profileId, loadOrder));
};
