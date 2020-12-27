import { Row } from '../../typings';

export interface DbOperation {
  table: string;
  findId?: number;
  row?: Row;
  sql?: string;
  clauses?: {[key: string]: any};
  params?: any[];
}

