import { Entity } from '../../shared/model/entity';

export interface Property extends Entity {
  key: string;
  value: string;
}
