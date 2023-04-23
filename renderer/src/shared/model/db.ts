import { Entity } from './entity/entity';

export type Row = { [key: string]: any } | Entity;

export interface DbExecResult {
  /**
   * Row id of the inserted row.
   *
   * Only contains valid information when the query was a successfully
   * completed INSERT statement.
   */
  lastID?: number;
  /**
   * Number of rows changed.
   *
   * Only contains valid information when the query was a
   * successfully completed UPDATE or DELETE statement.
   */
  changes?: number;
}


export interface DbResult {
  exec?: DbExecResult
  rows?: Row[]
}


export interface DbOperation {
  type?: 'save' | 'find' | 'findAll' | 'query' | 'exec'

  table: string;
  findId?: number;
  row?: Row;
  sql?: string;
  clauses?: {[key: string]: any};
  params?: any[];
}

