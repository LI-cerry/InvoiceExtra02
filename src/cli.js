import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './config.js';
import { extractPdfText } from './pdf-extractor.js';
import { recognizeInvoice, validateInvoice } from './doubao-client.js';
import { writeResults } from './excel-store.js';

function args() { const out = {}; for (let i = 2; i < process.argv.length; i += 1) { const key = process.argv[i]; if (key.startsWith('--')) out[key.slice(2)] = process.argv[++i]; } return out; }
const config = loadConfig(args());
await fs.mkdir(path.join(config.outputDir, 'records'), { recursive: true });
const files = (await fs.readdir(config.inputDir)).filter(f => f.toLowerCase().endsWith('.pdf')).sort();
if (!files.length) throw new Error(`输入目录没有 PDF：${config.inputDir}`);
const records = [];
for (const name of files) { const file = path.join(config.inputDir, name); try { const text = await extractPdfText(file); const result = await recognizeInvoice(text, config); const data = validateInvoice(result.data, name); records.push({ file: name, data }); await fs.writeFile(path.join(config.outputDir, 'records', `${name.slice(0, -4)}.json`), JSON.stringify({ file: name, raw: result.raw, data }, null, 2), 'utf8'); console.log(`OK ${name}: ${data.seller_name}, ${data.items.length} 条明细`); } catch (error) { console.error(`FAIL ${name}: ${error.message}`); } }
if (!records.length) throw new Error('没有成功识别的发票，未写入模板。');
const outputs = await writeResults(config, records); console.log(`已写入：${outputs.sellerOut}`); console.log(`已写入：${outputs.stockOut}`);
