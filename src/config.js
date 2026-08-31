import 'dotenv/config';
import path from 'node:path';

export function loadConfig(args = {}) {
  const root = process.cwd();
  const apiKey = normalizeSecret(process.env.ARK_API_KEY);
  if (!apiKey) throw new Error('缺少 ARK_API_KEY，请在 .env 或环境变量中设置。');
  if (apiKey === 'replace-with-your-volcengine-key' || apiKey.length < 20) {
    throw new Error('ARK_API_KEY 仍是占位符或长度异常，请从火山方舟控制台复制新的 API Key。');
  }
  return {
    inputDir: path.resolve(args.input ?? process.env.INVOICE_INPUT_DIR ?? path.join(root, 'fapiao')),
    sellerTemplate: path.resolve(args.sellerTemplate ?? args['seller-template'] ?? path.join(root, '销售方名称.xlsx')),
    stockTemplate: path.resolve(args.stockTemplate ?? args['stock-template'] ?? path.join(root, '入库表.xls')),
    outputDir: path.resolve(args.output ?? path.join(root, 'output')),
    endpoint: process.env.ARK_ENDPOINT ?? 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: process.env.ARK_MODEL ?? 'doubao-1-5-lite-32k-250115',
    apiKey,
  };
}

function normalizeSecret(value) {
  if (!value) return '';
  return value.trim().replace(/^['"]|['"]$/g, '').trim();
}
