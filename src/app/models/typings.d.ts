declare module 'secure-offline-json-db' {
  export default class JsonOfflineDb {
    constructor(name: string, options?: any);
    createTable(tableName: string, options?: any): void;
    getAll(tableName: string): Promise<any[]>;
    getById(tableName: string, id: number): Promise<any>;
    insert(tableName: string, data: any): Promise<any>;
    update(tableName: string, id: number, data: any): Promise<any>;
    delete(tableName: string, id: number): Promise<void>;
    count(tableName: string): Promise<number>;
    truncate(tableName: string): Promise<void>;
    close(): void;
  }
}

declare module 'joi' {
  export function object(schema?: any): any;
  export function string(): any;
  export function number(): any;
  export function date(): any;
  export function valid(...values: any[]): any;
  export function required(): any;
  export function optional(): any;
  export function array(value: any): any;
  export function email(): any;
  export function min(limit: number): any;
  export function max(limit: number): any;
  export function allow(...values: any[]): any;
}