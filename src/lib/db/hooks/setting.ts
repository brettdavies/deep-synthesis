import type { Setting } from '../schema/setting';
import { generateUUID } from '../../utils/id/uuid';

type Modifications<T> = Partial<T>;

const addTimestampsAndUUID = (obj: Setting) => {
  const now = new Date();
  obj.id = generateUUID();
  obj.createdAt = now;
  obj.updatedAt = now;
};

const updateTimestamp = (modifications: Modifications<Setting>) => {
  modifications.updatedAt = new Date();
  return modifications;
};

export const settingHooks = {
  creating: (primKey: string, obj: Setting) => {
    addTimestampsAndUUID(obj);
  },
  updating: (modifications: Modifications<Setting>, primKey: string, obj: Setting) => {
    return updateTimestamp(modifications);
  }
}; 