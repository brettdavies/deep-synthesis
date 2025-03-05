import type { Report } from '../schema/report';
import { generateUUID } from '../../utils/id/uuid';

type Modifications<T> = Partial<T>;

const addTimestampsAndUUID = (obj: Report) => {
  const now = new Date();
  obj.id = generateUUID();
  obj.createdAt = now;
  obj.updatedAt = now;
};

const updateTimestamp = (modifications: Modifications<Report>) => {
  modifications.updatedAt = new Date();
  return modifications;
};

export const reportHooks = {
  creating: (primKey: string, obj: Report) => {
    addTimestampsAndUUID(obj);
  },
  updating: (modifications: Modifications<Report>, primKey: string, obj: Report) => {
    return updateTimestamp(modifications);
  }
}; 