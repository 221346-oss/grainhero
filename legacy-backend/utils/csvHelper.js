const csvParser = require('csv-parser');
const { Parser } = require('json2csv');
const multer = require('multer');
const stream = require('stream');

// Multer middleware for CSV file upload (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Helper to validate required fields in each row
function validateFields(row, requiredFields) {
  for (const field of requiredFields) {
    if (!row[field] && row[field] !== 0) {
      return false;
    }
  }
  return true;
}

// Import CSV: parses buffer, validates, and returns array of valid rows
async function importCSV(buffer, requiredFields) {
  return new Promise((resolve, reject) => {
    const results = [];
    const invalidRows = [];
    const readable = new stream.Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable
      .pipe(csvParser())
      .on('data', (row) => {
        if (validateFields(row, requiredFields)) {
          results.push(row);
        } else {
          invalidRows.push(row);
        }
      })
      .on('end', () => {
        resolve({ valid: results, invalid: invalidRows });
      })
      .on('error', (err) => reject(err));
  });
}

// Export CSV: converts array of objects to CSV string
function exportCSV(data, fields) {
  const parser = new Parser({ fields });
  return parser.parse(data);
}

module.exports = {
  upload,
  importCSV,
  exportCSV,
}; 