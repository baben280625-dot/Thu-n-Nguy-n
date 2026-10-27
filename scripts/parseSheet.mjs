import fs from 'fs';
import * as XLSX from 'xlsx';

const csvContent = fs.readFileSync('public/assets/aistudio/DATA_CHI_N_D_CH_18b3d223', 'utf8');

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

// Handle multi-line CSV with quotes properly:
function parseCSV(text) {
  const rows = [];
  let curRow = [];
  let curCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        curCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      curRow.push(curCell.trim());
      curCell = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      curRow.push(curCell.trim());
      if (curRow.length > 1 || curRow[0] !== '') {
        rows.push(curRow);
      }
      curRow = [];
      curCell = '';
    } else {
      curCell += c;
    }
  }
  if (curCell.length > 0 || curRow.length > 0) {
    curRow.push(curCell.trim());
    rows.push(curRow);
  }
  return rows;
}

const parsed = parseCSV(csvContent);
console.log('Total rows parsed:', parsed.length);
const dataRows = parsed.slice(1);
console.log('Data rows count:', dataRows.length);

const result = dataRows.map((r, i) => {
  const stt = r[0];
  const name = r[1] || '';
  let phone = r[2] || '';
  const address = r[3] || '';
  const message = r[4] || '';
  const need = r[5] || '';
  const note = r[6] || '';
  const date = r[7] || '';
  const staff = (r[8] || '').trim();

  // Notes are columns 9 onwards
  const legacyNotes = r.slice(9).filter(n => n && n.trim() !== '');

  return {
    stt: parseInt(stt) || (i + 1),
    name,
    phone,
    address,
    message,
    need,
    note,
    date,
    staff,
    legacyNotes
  };
});

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/importedGoogleSheetData.json', JSON.stringify(result, null, 2), 'utf8');
console.log('Successfully wrote src/data/importedGoogleSheetData.json with', result.length, 'records');
