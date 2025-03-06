import type { Brief } from '../schema/brief';
import { generateUUID } from '../../utils/id/uuid';

type Modifications<T> = Partial<T>;

const addTimestampsAndUUID = (obj: Brief) => {
  const now = new Date();
  obj.id = generateUUID();
  obj.createdAt = now;
  obj.updatedAt = now;
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