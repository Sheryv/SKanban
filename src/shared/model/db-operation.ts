import { Row } from '../../typings';

export interface DbOperation {
  table: string;
  findId?: number;
  row?: Row;
  sql?: string;
  params?: any[];
}

