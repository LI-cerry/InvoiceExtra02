import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';

const aliases = {
  seller: ['销售方名称', '销售方公司名称', '销售方', '供应商', '名称'],
  goods: ['货物', '货物名称', '商品名称', '物资名称'],
  unit: ['货物单位', '单位', '计量单位'],
  quantity: ['货物数量', '数量'],
  total_amount: ['价税合计', '含税金额', '金额'],
};
function locate(headers, kind) { return headers.findIndex(h => aliases[kind].includes(String(h).trim())); }
function readRows(file) { const book = XLSX.readFile(file, { cellDates: true }); const sheet = book.Sheets[book.SheetNames[0]]; return { book, sheet, rows: XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) }; }
function append(file, output, rowsToAdd, kinds) {
  const { book, sheet, rows } = readRows(file);
  const headers = rows[0] ?? [];
  const indexes = Object.fromEntries(kinds.map(k => [k, locate(headers, k)]));
  for (const kind of kinds) {
    if (indexes[kind] >= 0) continue;
    if (kind !== 'goods' || file.toLowerCase().endsWith('.xls')) throw new Error(`模板缺少列：${aliases[kind][0]}`);
    indexes[kind] = headers.length;
    headers.push('\u7269\u8d44\u540d\u79f0');
    XLSX.utils.sheet_add_aoa(sheet, [headers], { origin: 'A1' });
  }
  const values = rowsToAdd.map(item => { const row = Array(headers.length).fill(''); for (const [kind, value] of Object.entries(item)) row[indexes[kind]] = value; return row; });
  XLSX.utils.sheet_add_aoa(sheet, values, { origin: -1 });
  XLSX.writeFile(book, output);
}
export async function writeResults(config, records) {
  await fs.mkdir(path.join(config.outputDir, 'records'), { recursive: true });
  const sellerRows = records.map(({ data }) => ({ seller: data.seller_name, goods: data.items.map(item => item.goods).join('\u3001') }));
  const stockRows = records.map(({ data }) => { const multipleGoods = data.items.length > 1; return { goods: data.items.map(item => item.goods).join('\u3001'), unit: multipleGoods ? '\u6279' : data.items[0].unit, quantity: multipleGoods ? 1 : data.items[0].quantity, total_amount: data.invoice_total_amount }; });
  const sellerOut = path.join(config.outputDir, path.basename(config.sellerTemplate));
  const stockOut = path.join(config.outputDir, path.basename(config.stockTemplate));
  append(config.sellerTemplate, sellerOut, sellerRows, ['seller', 'goods']);
  append(config.stockTemplate, stockOut, stockRows, ['goods', 'unit', 'quantity', 'total_amount']);
  return { sellerOut, stockOut };
}
