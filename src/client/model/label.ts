import { Entity } from '../../shared/model/entity';

export interface Label extends Entity {
  title: string;
  create_date: number;
  bg_color: string;
  board_id: number;
  
  $fgInvert?: boolean;
}
