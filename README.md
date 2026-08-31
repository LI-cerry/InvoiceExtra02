# 发票识别入表

本工具使用 Doubao-Seed-2.0-lite 大模型识别发票内容：先提取 PDF 文本，再通过火山方舟 API 解析发票字段和明细，最后写入 Excel 模板。使用前请准备火山方舟 API Key，并配置到 `.env` 的 `ARK_API_KEY`。

## 使用

1. 安装 Node.js 18+ 和依赖：`npm install`
2. 复制 `.env.example` 为 `.env`，填写 `ARK_API_KEY`。
3. 将发票 PDF 放在 `fapiao/`，运行 `npm start`。

默认读取 `销售方名称.xlsx` 和 `入库表.xls`，结果写入 `output/`，不会覆盖原模板。可用参数覆盖路径：

```text
node src/cli.js --input ./fapiao --seller-template ./销售方名称.xlsx --stock-template ./入库表.xls --output ./output
```

每张发票的原始模型响应和解析结果会保存到 `output/records/`，便于审计和重试。
