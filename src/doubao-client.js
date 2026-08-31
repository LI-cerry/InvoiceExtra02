const schema = '{"seller_name":"seller","invoice_total_amount":0,"items":[{"goods":"goods","unit":"unit","quantity":0}]}';
export async function recognizeInvoice(text, config) {
  const prompt = `Extract seller name, the invoice grand total labeled 价税合计（小写）, and every distinct goods line. Return JSON only. invoice_total_amount must be the grand total including tax, as a number. Keep each distinct goods line in items even when there are multiple goods. Schema: ${schema}\nInvoice text: ${text}`;
  const responsesEndpoint = /\/responses\/?$/i.test(config.endpoint);
  let response = await send(config, responsesEndpoint
    ? { model: config.model, temperature: 0, input: prompt }
    : { model: config.model, temperature: 0, messages: [{ role: 'system', content: 'You extract invoice fields.' }, { role: 'user', content: prompt }] });
  let json = await readResponse(response, { allowInvalidMessages: !responsesEndpoint });
  if (!responsesEndpoint && json?.error?.code === 'InvalidParameter' && /unknown field ["']messages["']/.test(json.error.message ?? '')) { response = await send(config, { model: config.model, temperature: 0, input: prompt }); json = await readResponse(response); }
  const content = findText(json);
  if (!content) throw new Error(`Doubao response did not contain model output (keys: ${Object.keys(json ?? {}).join(', ')})`);
  return { raw: content, data: parseJson(content) };
}
async function send(config, body) { return fetch(config.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify(body) }); }
async function readResponse(response, options = {}) {
  const detail = await response.text();
  let json; try { json = JSON.parse(detail); } catch { json = null; }
  if (!response.ok) {
    const isMessagesMismatch = response.status === 400 && json?.error?.code === 'InvalidParameter' && /unknown field ["']messages["']/.test(json.error.message ?? '');
    if (options.allowInvalidMessages && isMessagesMismatch) return json;
    if (response.status === 401) throw new Error('Doubao API 401: ARK_API_KEY is invalid or revoked.');
    throw new Error(`Doubao API ${response.status}: ${detail}`);
  }
  return json;
}
function findText(value) {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) { const parts = value.map(findText).filter(Boolean); return parts.join(''); }
  if (!value || typeof value !== 'object') return '';
  if (typeof value.output_text === 'string' && value.output_text.trim()) return value.output_text;
  if (typeof value.text === 'string' && value.text.trim()) return value.text;
  for (const key of ['choices', 'message', 'content', 'output', 'results']) {
    if (key in value) { const found = findText(value[key]); if (found) return found; }
  }
  return '';
}
function parseJson(content) { const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''); try { return JSON.parse(cleaned); } catch { throw new Error(`Model output is not valid JSON: ${content.slice(0, 300)}`); } }
export function validateInvoice(data, source) {
  if (!data || typeof data.seller_name !== 'string' || !data.seller_name.trim()) throw new Error(`${source}: seller_name missing`);
  if (!Array.isArray(data.items) || !data.items.length) throw new Error(`${source}: items empty`);
  const invoiceTotal = parseNumber(data.invoice_total_amount ?? data.total_amount ?? data.grand_total);
  if (!Number.isFinite(invoiceTotal)) throw new Error(`${source}: invoice_total_amount missing or invalid`);
  const items = data.items.map((item, i) => {
    if (!item || !String(item.goods ?? '').trim()) throw new Error(`${source}: item ${i + 1} goods missing`);
    const quantity = parseNumber(item.quantity);
    const total = parseNumber(item.total_amount);
    if (data.items.length === 1 && (!String(item.unit ?? '').trim() || !Number.isFinite(quantity))) throw new Error(`${source}: single item unit/quantity invalid`);
    return { goods: String(item.goods).trim(), unit: String(item.unit ?? '').trim(), quantity: Number.isFinite(quantity) ? quantity : null, total_amount: Number.isFinite(total) ? total : null };
  });
  return { seller_name: data.seller_name.trim(), invoice_total_amount: invoiceTotal, items };
}
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  if (typeof value === 'number') return value;
  const normalized = String(value).replace(/[￥¥,，\s元]/g, '').trim();
  return normalized ? Number(normalized) : NaN;
}
