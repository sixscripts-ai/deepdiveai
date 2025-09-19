#!/usr/bin/env node

/**
 * Test script for PostgreSQL migration
 * Tests the migration script functionality without requiring PostgreSQL connection
 */

const fs = require('fs');
const path = require('path');
const PostgreSQLMigrator = require('./migrate_to_postgresql.cjs');

class MigrationTester {
    constructor() {
        this.testResults = [];
    }

    log(message, status = 'info') {
        const timestamp = new Date().toISOString();
        const result = { timestamp, status, message };
        this.testResults.push(result);
        
        const prefix = {
            pass: '✅',
            fail: '❌',
            info: 'ℹ️ ',
            warning: '⚠️ '
        }[status] || 'ℹ️ ';
        
        console.log(`${prefix} ${message}`);
    }

    async testSchemaGeneration() {
        try {
            this.log('Testing PostgreSQL schema generation...');
            
            const migrator = new PostgreSQLMigrator({
                sqlitePath: './deepdive.db',
                postgresql: { host: 'test', database: 'test' }
            });
            
            const schema = migrator.getPostgreSQLSchema();
            
            // Check if schema contains expected elements
            const expectedElements = [
                'CREATE TABLE IF NOT EXISTS files',
                'CREATE TABLE IF NOT EXISTS analysis_results',
                'CREATE TABLE IF NOT EXISTS chat_messages',
                'CREATE INDEX',
                'CREATE TRIGGER',
                'JSONB',
                'TIMESTAMPTZ',
                'SERIAL PRIMARY KEY'
            ];
            
            for (const element of expectedElements) {
                if (!schema.includes(element)) {
                    throw new Error(`Schema missing expected element: ${element}`);
                }
            }
            
            this.log('Schema generation test passed', 'pass');
            return true;
            
        } catch (error) {
            this.log(`Schema generation test failed: ${error.message}`, 'fail');
            return false;
        }
    }

    async testDateTimeConversion() {
        try {
            this.log('Testing datetime conversion...');
            
            const migrator = new PostgreSQLMigrator({
                sqlitePath: './deepdive.db',
                postgresql: { host: 'test', database: 'test' }
            });
            
            // Test various datetime formats
            const testCases = [
                { input: '2024-01-15 10:30:45', expected: '2024-01-15T10:30:45.000Z' },
                { input: '2024-12-31 23:59:59', expected: '2024-12-31T23:59:59.000Z' },
                { input: null, expected: null },
                { input: '', expected: null }
            ];
            
            for (const testCase of testCases) {
                const result = migrator.convertDateTime(testCase.input);
                if (result !== testCase.expected) {
                    // Allow for slight variations in ISO string format
                    if (testCase.expected && result && new Date(result).getTime() === new Date(testCase.expected).getTime()) {
                        continue; // Valid conversion
                    }
                    throw new Error(`DateTime conversion failed: ${testCase.input} -> ${result}, expected ${testCase.expected}`);
                }
            }
            
            this.log('DateTime conversion test passed', 'pass');
            return true;
            
        } catch (error) {
            this.log(`DateTime conversion test failed: ${error.message}`, 'fail');
            return false;
        }
    }

    async testJSONParsing() {
        try {
            this.log('Testing JSON parsing...');
            
            const migrator = new PostgreSQLMigrator({
                sqlitePath: './deepdive.db',
                postgresql: { host: 'test', database: 'test' }
            });
            
            // Test various JSON cases
            const testCases = [
                { input: '{"key": "value"}', expected: { key: "value" } },
                { input: '["item1", "item2"]', expected: ["item1", "item2"] },
                { input: null, expected: null },
                { input: '', expected: null },
                { input: 'invalid json', expected: null }
            ];
            
            for (const testCase of testCases) {
                const result = migrator.parseJSON(testCase.input);
                if (JSON.stringify(result) !== JSON.stringify(testCase.expected)) {
                    throw new Error(`JSON parsing failed: ${testCase.input} -> ${JSON.stringify(result)}, expected ${JSON.stringify(testCase.expected)}`);
                }
            }
            
            this.log('JSON parsing test passed', 'pass');
            return true;
            
        } catch (error) {
            this.log(`JSON parsing test failed: ${error.message}`, 'fail');
            return false;
        }
    }

    async testSQLiteConnection() {
        try {
            this.log('Testing SQLite database connection...');
            
            const dbPath = path.join(process.cwd(), 'deepdive.db');
            
            if (!fs.existsSync(dbPath)) {
                this.log('SQLite database not found - this is expected for new installations', 'warning');
                return true;
            }
            
            // Try to read the database
            const Database = require('better-sqlite3');
            const db = new Database(dbPath, { readonly: true });
            
            // Check if tables exist
            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            const expectedTables = ['files', 'analysis_results', 'chat_messages'];
            
            for (const expectedTable of expectedTables) {
                const tableExists = tables.some(table => table.name === expectedTable);
                if (!tableExists) {
                    this.log(`Table ${expectedTable} not found in SQLite database`, 'warning');
                }
            }
            
            // Get record counts
            const counts = {};
            for (const table of expectedTables) {
                try {
                    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
                    counts[table] = result.count;
                } catch (error) {
                    counts[table] = 0;
                }
            }
            
            db.close();
            
            this.log(`SQLite database found with records: ${JSON.stringify(counts)}`, 'pass');
            return true;
            
        } catch (error) {
            this.log(`SQLite connection test failed: ${error.message}`, 'fail');
            return false;
        }
    }

    async testConfigurationValidation() {
        try {
            this.log('Testing configuration validation...');
            
            // Test with minimal config
            const migrator1 = new PostgreSQLMigrator({});
            if (!migrator1.config.sqlitePath || !migrator1.config.postgresql) {
                throw new Error('Default configuration not properly set');
            }
            
            // Test with custom config
            const customConfig = {
                sqlitePath: '/custom/path/db.sqlite',
                postgresql: {
                    host: 'custom-host',
                    port: 5433,
                    database: 'custom-db',
                    user: 'custom-user',
                    password: 'custom-pass',
                    ssl: true
                },
                batchSize: 500,
                validateData: false,
                createBackup: false
            };
            
            const migrator2 = new PostgreSQLMigrator(customConfig);
            
            // Verify custom config is applied
            if (migrator2.config.sqlitePath !== customConfig.sqlitePath) {
                throw new Error('Custom SQLite path not applied');
            }
            
            if (migrator2.config.postgresql.host !== customConfig.postgresql.host) {
                throw new Error('Custom PostgreSQL config not applied');
            }
            
            if (migrator2.config.batchSize !== customConfig.batchSize) {
                throw new Error('Custom batch size not applied');
            }
            
            this.log('Configuration validation test passed', 'pass');
            return true;
            
        } catch (error) {
            this.log(`Configuration validation test failed: ${error.message}`, 'fail');
            return false;
        }
    }

    async runAllTests() {
        this.log('🚀 Starting migration script tests...');
        
        const tests = [
            this.testSchemaGeneration(),
            this.testDateTimeConversion(),
            this.testJSONParsing(),
            this.testSQLiteConnection(),
            this.testConfigurationValidation()
        ];
        
        const results = await Promise.all(tests);
        const passedTests = results.filter(result => result).length;
        const totalTests = results.length;
        
        this.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            this.log('🎉 All tests passed! Migration script is ready to use.', 'pass');
        } else {
            this.log(`⚠️  ${totalTests - passedTests} tests failed. Please review the issues above.`, 'warning');
        }
        
        return passedTests === totalTests;
    }

    async saveTestResults() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logPath = path.join(process.cwd(), `migration-test-${timestamp}.json`);
            
            fs.writeFileSync(logPath, JSON.stringify(this.testResults, null, 2));
            this.log(`📝 Test results saved: ${logPath}`);
        } catch (error) {
            this.log(`❌ Failed to save test results: ${error.message}`, 'fail');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new MigrationTester();
    
    tester.runAllTests()
        .then(async (success) => {
            await tester.saveTestResults();
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = MigrationTester;