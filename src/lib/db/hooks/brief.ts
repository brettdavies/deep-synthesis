import type { Brief } from '../schema/brief';
import { generateUUID } from '../../utils/id/uuid';

type Modifications<T> = Partial<T>;

const addTimestampsAndUUID = (obj: Brief) => {
  const now = new Date();
  // Only generate a UUID if one doesn't already exist
  if (!obj.id) {
    obj.id = generateUUID();
  }
  
  // Always add timestamps
  obj.createdAt = obj.createdAt || now;
  obj.updatedAt = obj.updatedAt || now;
};

const updateTimestamp = (modifications: Modifications<Brief>) => {
  modifications.updatedAt = new Date();
  return modifications;
};

export const briefHooks = {
  creating: (primKey: string, obj: Brief) => {
    addTimestampsAndUUID(obj);
  },
  updating: (modifications: Modifications<Brief>, primKey: string, obj: Brief) => {
    return updateTimestamp(modifications);
  }
}; 