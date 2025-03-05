import type { Paper } from '../schema/paper';
import { generateUUID } from '../../utils/id/uuid';

type Modifications<T> = Partial<T>;

const addTimestampsAndUUID = (obj: Paper) => {
  const now = new Date();
  obj.id = generateUUID();
  obj.createdAt = now;
  obj.updatedAt = now;
};

const updateTimestamp = (modifications: Modifications<Paper>) => {
  modifications.updatedAt = new Date();
  return modifications;
};

export const paperHooks = {
  creating: (primKey: string, obj: Paper) => {
    addTimestampsAndUUID(obj);
  },
  updating: (modifications: Modifications<Paper>, primKey: string, obj: Paper) => {
    return updateTimestamp(modifications);
  }
}; 