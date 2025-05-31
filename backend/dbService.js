import pool from './database.js';

/**
 * Database service to abstract MySQL queries
 */
export const dbService = {
  /**
   * Insert a record
   * @param {string} table - Table name
   * @param {object} data - Data to insert
   * @returns {Promise} - Promise with insert result
   */
  async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const [result] = await pool.execute(query, values);
    return result;
  },

  /**
   * Select records from a table
   * @param {string} table - Table name
   * @param {string|string[]} columns - Columns to select
   * @param {object} [conditions] - Where conditions
   * @returns {Promise} - Promise with select results
   */
  async select(table, columns = '*', conditions = null) {
    try {
        // Debugging logs
        console.log('Select Input:', { table, columns, conditions });

        let query = `SELECT ${Array.isArray(columns) ? columns.join(', ') : columns} FROM ${table}`;
        const values = [];
        
        if (conditions) {
            const whereConditions = [];
            for (const [key, value] of Object.entries(conditions)) {
                whereConditions.push(`${key} = ?`);
                values.push(value);
            }
            if (whereConditions.length > 0) {
                query += ` WHERE ${whereConditions.join(' AND ')}`;
            }
        }

        // Log the final query and values
        console.log('Executing Query:', query);
        console.log('With Values:', values);

        const [rows] = await pool.execute(query, values);
        
        // Log the results
        console.log('Query Results:', rows);

        return { 
            data: rows.length > 0 ? rows : null,
            error: null 
        };
    } catch (error) {
        console.error('Database Error:', error);
        return { 
            data: null,
            error: error.message 
        };
    }
  },

  /**
   * Update records in a table
   * @param {string} table - Table name
   * @param {object} data - Data to update
   * @param {object} conditions - Where conditions
   * @returns {Promise} - Promise with update result
   */
  async update(table, data, conditions) {
    const setValues = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      setValues.push(`${key} = ?`);
      values.push(value);
    }
    
    const whereConditions = [];
    for (const [key, value] of Object.entries(conditions)) {
      whereConditions.push(`${key} = ?`);
      values.push(value);
    }
    
    const query = `UPDATE ${table} SET ${setValues.join(', ')} WHERE ${whereConditions.join(' AND ')}`;
    const [result] = await pool.execute(query, values);
    return result;
  },

  /**
   * Delete records from a table
   * @param {string} table - Table name
   * @param {object} conditions - Where conditions
   * @returns {Promise} - Promise with delete result
   */
  async delete(table, conditions) {
    const whereConditions = [];
    const values = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      whereConditions.push(`${key} = ?`);
      values.push(value);
    }
    
    const query = `DELETE FROM ${table} WHERE ${whereConditions.join(' AND ')}`;
    const [result] = await pool.execute(query, values);
    return result;
  },

  /**
   * Execute a custom SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise} - Promise with query result
   */
  async query(query, params = []) {
    const [result] = await pool.execute(query, params);
    return result;
  },

  /**
   * Check if a record exists
   * @param {string} table - Table name
   * @param {object} conditions - Where conditions
   * @returns {Promise<boolean>} - Promise with boolean result
   */
  async exists(table, conditions) {
    const rows = await this.select(table, 'COUNT(*) as count', conditions);
    return rows[0].count > 0;
  },

  /**
   * Get a single record
   * @param {string} table - Table name 
   * @param {string|string[]} columns - Columns to select
   * @param {object} conditions - Where conditions
   * @returns {Promise} - Promise with a single record or null
   */
  async getOne(table, columns = '*', conditions) {
    const rows = await this.select(table, columns, conditions);
    return rows.length > 0 ? rows[0] : null;
  }
};

export default dbService; 