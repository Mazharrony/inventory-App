import { getDemoData, saveDemoData, initializeDemoData } from './demoData';
import { Database } from '@/integrations/types';
import { logger } from './logger';

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

interface QueryBuilder<T extends TableName> {
  select(columns?: string): QueryBuilder<T>;
  insert(data: TableInsert<T> | TableInsert<T>[]): Promise<{ data: TableRow<T>[] | null; error: any }>;
  update(data: TableUpdate<T>): UpdateBuilder<T>;
  delete(): Promise<{ data: TableRow<T>[] | null; error: any }>;
  eq(column: keyof TableRow<T>, value: any): QueryBuilder<T>;
  neq(column: keyof TableRow<T>, value: any): QueryBuilder<T>;
  gt(column: keyof TableRow<T>, value: any): QueryBuilder<T>;
  gte(column: keyof TableRow<T>, value: any): QueryBuilder<T>;
  lt(column: keyof TableRow<T>, value: any): QueryBuilder<T>;
  lte(column: keyof TableRow<T>, value: any): QueryBuilder<T>;
  like(column: keyof TableRow<T>, pattern: string): QueryBuilder<T>;
  ilike(column: keyof TableRow<T>, pattern: string): QueryBuilder<T>;
  in(column: keyof TableRow<T>, values: any[]): QueryBuilder<T>;
  is(column: keyof TableRow<T>, value: any): QueryBuilder<T>;
  or(conditions: string): QueryBuilder<T>;
  order(column: keyof TableRow<T>, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  single(): Promise<{ data: TableRow<T> | null; error: any }>;
  maybeSingle(): Promise<{ data: TableRow<T> | null; error: any }>;
  then<TResult1 = { data: TableRow<T>[] | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: TableRow<T>[] | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
}

interface UpdateBuilder<T extends TableName> {
  eq(column: keyof TableRow<T>, value: any): UpdateBuilder<T>;
  neq(column: keyof TableRow<T>, value: any): UpdateBuilder<T>;
  then<TResult1 = { data: TableRow<T>[] | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: TableRow<T>[] | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
}

class MockQueryBuilder<T extends TableName> implements QueryBuilder<T> {
  private table: T;
  private filters: Array<{ type: string; column: string; value: any }> = [];
  private orConditions: Array<Array<{ type: string; column: string; value: any }>> = [];
  private orderBy?: { column: string; ascending: boolean };
  private limitCount?: number;
  private rangeFrom?: number;
  private rangeTo?: number;
  private selectedColumns?: string;

  constructor(table: T) {
    this.table = table;
  }

  select(columns: string = '*'): QueryBuilder<T> {
    this.selectedColumns = columns;
    return this;
  }

  eq(column: keyof TableRow<T>, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'eq', column: column as string, value });
    return this;
  }

  neq(column: keyof TableRow<T>, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'neq', column: column as string, value });
    return this;
  }

  gt(column: keyof TableRow<T>, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'gt', column: column as string, value });
    return this;
  }

  gte(column: keyof TableRow<T>, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'gte', column: column as string, value });
    return this;
  }

  lt(column: keyof TableRow<T>, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'lt', column: column as string, value });
    return this;
  }

  lte(column: keyof TableRow<T>, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'lte', column: column as string, value });
    return this;
  }

  like(column: keyof TableRow<T>, pattern: string): QueryBuilder<T> {
    this.filters.push({ type: 'like', column: column as string, value: pattern });
    return this;
  }

  ilike(column: keyof TableRow<T>, pattern: string): QueryBuilder<T> {
    this.filters.push({ type: 'ilike', column: column as string, value: pattern });
    return this;
  }

  in(column: keyof TableRow<T>, values: any[]): QueryBuilder<T> {
    this.filters.push({ type: 'in', column: column as string, value: values });
    return this;
  }

  is(column: keyof TableRow<T>, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'is', column: column as string, value });
    return this;
  }

  or(conditions: string): QueryBuilder<T> {
    // Parse Supabase or conditions like "column1.eq.value1,column2.eq.value2" or "column.is.null,column.eq.true"
    // Also handles "name.ilike.%pattern%,upc.ilike.%pattern%"
    const conditionGroups = conditions.split(',');
    const orGroup: Array<{ type: string; column: string; value: any }> = [];
    
    for (const condition of conditionGroups) {
      const trimmed = condition.trim();
      
      // Special handling for ilike/like operators that may contain % in the pattern
      if (trimmed.includes('.ilike.') || trimmed.includes('.like.')) {
        const match = trimmed.match(/^(\w+)\.(ilike|like)\.(.+)$/);
        if (match) {
          const [, column, operator, pattern] = match;
          orGroup.push({ type: operator, column, value: pattern });
          continue;
        }
      }
      
      // Standard parsing for other operators: "column.operator.value"
      const parts = trimmed.split('.');
      if (parts.length >= 3) {
        const column = parts[0];
        const operator = parts[1];
        // Join remaining parts in case value contains dots (unlikely but possible)
        let value: any = parts.slice(2).join('.');
        
        // Handle special cases
        if (operator === 'is' && value === 'null') {
          value = null;
        } else if (operator === 'eq' && value === 'true') {
          value = true;
        } else if (operator === 'eq' && value === 'false') {
          value = false;
        }
        
        orGroup.push({ type: operator, column, value });
      }
    }
    
    if (orGroup.length > 0) {
      this.orConditions.push(orGroup);
    }
    
    return this;
  }

  order(column: keyof TableRow<T>, options?: { ascending?: boolean }): QueryBuilder<T> {
    this.orderBy = { column: column as string, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): QueryBuilder<T> {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  private applyFilters(data: any[]): any[] {
    return data.filter(item => {
      // Apply regular filters (AND logic)
      const passesRegularFilters = this.filters.every(filter => {
        const itemValue = item[filter.column];
        return this.evaluateFilter(filter, itemValue);
      });
      
      // Apply OR conditions (at least one condition in each OR group must pass)
      const passesOrConditions = this.orConditions.every(orGroup => {
        return orGroup.some(filter => {
          const itemValue = item[filter.column];
          return this.evaluateFilter(filter, itemValue);
        });
      });
      
      return passesRegularFilters && (this.orConditions.length === 0 || passesOrConditions);
    });
  }

  private evaluateFilter(filter: { type: string; column: string; value: any }, itemValue: any): boolean {
    switch (filter.type) {
      case 'eq':
        return itemValue === filter.value;
      case 'neq':
        return itemValue !== filter.value;
      case 'gt':
        return itemValue > filter.value;
      case 'gte':
        return itemValue >= filter.value;
      case 'lt':
        return itemValue < filter.value;
      case 'lte':
        return itemValue <= filter.value;
      case 'like':
        return String(itemValue || '').includes(filter.value.replace(/%/g, ''));
      case 'ilike':
        const pattern = filter.value.replace(/%/g, '').toLowerCase();
        return String(itemValue || '').toLowerCase().includes(pattern);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(itemValue);
      case 'is':
        if (filter.value === null) {
          return itemValue === null || itemValue === undefined;
        }
        return itemValue === filter.value;
      default:
        return true;
    }
  }

  private applySorting(data: any[]): any[] {
    if (!this.orderBy) return data;
    return [...data].sort((a, b) => {
      const aVal = a[this.orderBy!.column];
      const bVal = b[this.orderBy!.column];
      if (aVal === bVal) return 0;
      const comparison = aVal > bVal ? 1 : -1;
      return this.orderBy!.ascending ? comparison : -comparison;
    });
  }

  private applyPagination(data: any[]): any[] {
    let result = data;
    if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
      result = result.slice(this.rangeFrom, this.rangeTo + 1);
    } else if (this.limitCount !== undefined) {
      result = result.slice(0, this.limitCount);
    }
    return result;
  }

  then<TResult1 = { data: TableRow<T>[] | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: TableRow<T>[] | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    logger.debug(`MockQueryBuilder query`, { table: this.table, filters: this.filters, orderBy: this.orderBy }, 'MockSupabase');
    
    // Execute immediately and return a resolved promise
    try {
        // Ensure data is initialized
        initializeDemoData();
        const demoData = getDemoData();
      let tableData: any[] = [];

      switch (this.table) {
        case 'products':
          tableData = demoData.products || [];
          break;
        case 'sales':
          tableData = demoData.sales || [];
          break;
        case 'sellers':
          tableData = demoData.sellers || [];
          break;
        case 'customers':
          tableData = demoData.customers || [];
          break;
        case 'stock_movements':
          tableData = demoData.stockMovements || [];
          break;
        case 'undo_logs':
          tableData = demoData.undoLogs || [];
          break;
        case 'profiles':
        case 'admin_users':
          // Return empty array for auth tables (auth handled separately)
          tableData = [];
          break;
        default:
          tableData = [];
      }

      // Apply filters, sorting, and pagination
      let filtered = this.applyFilters(tableData);
      filtered = this.applySorting(filtered);
      filtered = this.applyPagination(filtered);

      const result = { data: filtered, error: null };
      logger.debug(`Query completed`, { table: this.table, resultCount: filtered.length }, 'MockSupabase');
      
      // Return a resolved promise immediately
      const promise = Promise.resolve(result);
      
      if (onfulfilled) {
        return promise.then(onfulfilled);
      }
      return promise as any;
    } catch (error) {
      logger.error('MockSupabase query error', error, 'MockSupabase');
      const errorPromise = Promise.reject(error);
      if (onrejected) {
        return errorPromise.catch(onrejected);
      }
      return errorPromise;
    }
  }
  
  // Make it properly awaitable
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<{ data: TableRow<T>[] | null; error: any } | TResult> {
    return this.then(undefined, onrejected);
  }
  
  finally(onfinally?: (() => void) | null): Promise<{ data: TableRow<T>[] | null; error: any }> {
    return this.then(
      (value) => {
        if (onfinally) onfinally();
        return value;
      },
      (reason) => {
        if (onfinally) onfinally();
        throw reason;
      }
    );
  }

  async single(): Promise<{ data: TableRow<T> | null; error: any }> {
    const result = await this.then();
    return {
      data: result.data && result.data.length > 0 ? result.data[0] : null,
      error: result.error,
    };
  }

  async maybeSingle(): Promise<{ data: TableRow<T> | null; error: any }> {
    return this.single();
  }

  async insert(data: TableInsert<T> | TableInsert<T>[]): Promise<{ data: TableRow<T>[] | null; error: any }> {
    try {
      const demoData = getDemoData();
      const items = Array.isArray(data) ? data : [data];
      const inserted: TableRow<T>[] = [];

      items.forEach(item => {
        const newItem: any = {
          ...item,
          id: item.id || `${this.table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        };

        switch (this.table) {
          case 'products':
            demoData.products.push(newItem);
            break;
          case 'sales':
            demoData.sales.push(newItem);
            break;
          case 'sellers':
            demoData.sellers.push(newItem);
            break;
          case 'customers':
            newItem.id = newItem.id || (demoData.customers.length + 1);
            demoData.customers.push(newItem);
            break;
          case 'stock_movements':
            newItem.id = newItem.id || (demoData.stockMovements.length + 1);
            demoData.stockMovements.push(newItem);
            break;
          case 'undo_logs':
            demoData.undoLogs.push(newItem);
            break;
          case 'profiles':
          case 'admin_users':
            // Auth tables not stored locally
            break;
        }

        inserted.push(newItem);
      });

      saveDemoData(demoData);
      return { data: inserted, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  update(data: TableUpdate<T>): UpdateBuilder<T> {
    return new MockUpdateBuilder(this.table, data, this.filters);
  }

  async delete(): Promise<{ data: TableRow<T>[] | null; error: any }> {
    try {
      const demoData = getDemoData();
      let tableData: any[] = [];

      switch (this.table) {
        case 'products':
          tableData = demoData.products;
          break;
        case 'sales':
          tableData = demoData.sales;
          break;
        case 'sellers':
          tableData = demoData.sellers;
          break;
        case 'customers':
          tableData = demoData.customers;
          break;
        case 'stock_movements':
          tableData = demoData.stockMovements;
          break;
        case 'undo_logs':
          tableData = demoData.undoLogs;
          break;
        case 'profiles':
        case 'admin_users':
          tableData = [];
          break;
      }

      const filtered = this.applyFilters(tableData);
      const deleted: any[] = [];

      filtered.forEach(item => {
        const index = tableData.findIndex(i => i.id === item.id);
        if (index !== -1) {
          deleted.push(tableData[index]);
          tableData.splice(index, 1);
        }
      });

      saveDemoData(demoData);
      return { data: deleted, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

class MockUpdateBuilder<T extends TableName> implements UpdateBuilder<T> {
  private table: T;
  private updateData: TableUpdate<T>;
  private filters: Array<{ type: string; column: string; value: any }> = [];

  constructor(table: T, updateData: TableUpdate<T>, filters: Array<{ type: string; column: string; value: any }>) {
    this.table = table;
    this.updateData = updateData;
    this.filters = [...filters];
  }

  eq(column: keyof TableRow<T>, value: any): UpdateBuilder<T> {
    this.filters.push({ type: 'eq', column: column as string, value });
    return this;
  }

  neq(column: keyof TableRow<T>, value: any): UpdateBuilder<T> {
    this.filters.push({ type: 'neq', column: column as string, value });
    return this;
  }

  private applyFilters(data: any[]): any[] {
    return data.filter(item => {
      return this.filters.every(filter => {
        const itemValue = item[filter.column];
        switch (filter.type) {
          case 'eq':
            return itemValue === filter.value;
          case 'neq':
            return itemValue !== filter.value;
          default:
            return true;
        }
      });
    });
  }

  then<TResult1 = { data: TableRow<T>[] | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: TableRow<T>[] | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve().then(() => {
      try {
        const demoData = getDemoData();
        let tableData: any[] = [];

        switch (this.table) {
          case 'products':
            tableData = demoData.products;
            break;
          case 'sales':
            tableData = demoData.sales;
            break;
          case 'sellers':
            tableData = demoData.sellers;
            break;
          case 'customers':
            tableData = demoData.customers;
            break;
          case 'stock_movements':
            tableData = demoData.stockMovements;
            break;
          case 'undo_logs':
            tableData = demoData.undoLogs;
            break;
          case 'profiles':
          case 'admin_users':
            tableData = [];
            break;
        }

        const filtered = this.applyFilters(tableData);
        const updated: any[] = [];

        filtered.forEach(item => {
          const index = tableData.findIndex(i => i.id === item.id);
          if (index !== -1) {
            const updatedItem = {
              ...tableData[index],
              ...this.updateData,
              updated_at: new Date().toISOString(),
            };
            tableData[index] = updatedItem;
            updated.push(updatedItem);
          }
        });

        saveDemoData(demoData);
        const result = { data: updated, error: null };
        
        if (onfulfilled) {
          return onfulfilled(result);
        }
        return result as any;
      } catch (error) {
        if (onrejected) {
          return onrejected(error);
        }
        throw error;
      }
    });
  }
}

export class MockSupabaseClient {
  auth: any = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: async () => ({ data: { user: null }, error: null }),
  };

  from<T extends TableName>(table: T): QueryBuilder<T> {
    // Ensure data is initialized before creating query builder
    try {
      initializeDemoData();
    } catch (error) {
      logger.error('Error initializing data', error, 'MockSupabase');
    }
    return new MockQueryBuilder(table) as any;
  }

  constructor() {
    // Initialize data immediately
    try {
      initializeDemoData();
    } catch (error) {
      logger.error('Error initializing data', error, 'MockSupabase');
    }
  }
}

