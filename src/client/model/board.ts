import { Entity } from '../../shared/model/entity';

export interface Board extends Entity {
  title: string;
  create_date: number;
  deleted: number;
  type_label_id: number;
}
