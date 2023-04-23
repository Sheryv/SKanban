import { Entity } from './entity';

export interface Property extends Entity {
  key: string;
  value: string;
}
