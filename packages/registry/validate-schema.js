#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Initialize AJV with format support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// File paths
const schemaPath = path.join(__dirname, 'schemas', 'server-schema.json');
const dataPath = path.join(__dirname, 'servers.json');

try {
  // Read schema and data files
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Compile the schema
  const validate = ajv.compile(schema);

  // Validate the data
  const valid = validate(data);

  if (valid) {
    console.log('✅ Registry validation passed! All servers are valid.');
    console.log(`Validated ${data.servers.length} servers`);
    process.exit(0);
  } else {
    console.log('❌ Registry validation failed!');
    console.log('\nValidation errors:');
    
    validate.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.instancePath || 'root'}: ${error.message}`);
      if (error.data !== undefined) {
        console.log(`   Value: ${JSON.stringify(error.data)}`);
      }
      if (error.allowedValues) {
        console.log(`   Allowed values: ${error.allowedValues.join(', ')}`);
      }
    });
    
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error during validation:', error.message);
  process.exit(1);
} 