const assert = require('assert');

console.log('--- [Test Suite] ECharts Chart Support & Validation ---');

// Test 1: Verify echarts package resolution
try {
  const echartsPackage = require.resolve('echarts');
  assert.ok(echartsPackage, 'echarts package should resolve correctly');
  console.log('   ✓ ECharts npm package resolved successfully');
} catch (e) {
  console.error('   ❌ echarts resolution failed:', e.message);
  process.exit(1);
}

// Helper simulating parseChartSpec
function parseChartSpec(rawCode) {
  let cleaned = String(rawCode || '').trim();
  cleaned = cleaned.replace(/^```(?:json|chart|echarts)?\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    try {
      const fixed = cleaned.replace(/,\s*([\]}])/g, '$1');
      parsed = JSON.parse(fixed);
    } catch {
      throw new Error(`JSON inválido: ${err.message}`);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('A especificação do gráfico deve ser um objeto JSON.');
  }

  return (parsed.spec && typeof parsed.spec === 'object') ? parsed.spec : parsed;
}

// Test 2: User's exact chart specification from screenshot
const userChartInput = `{
  "version": 1,
  "renderer": "echarts",
  "spec": {
    "title": {
      "text": "Regressão linear simples (dados ilustrativos)",
      "subtext": "Pontos = observações | Linha = reta ajustada por mínimos quadrados"
    },
    "tooltip": { "trigger": "axis" },
    "legend": { "data": ["Observações", "Reta ajustada"], "bottom": 0 },
    "xAxis": { "type": "value", "name": "X" },
    "yAxis": { "type": "value", "name": "Y" },
    "series": [
      {
        "name": "Observações",
        "type": "scatter",
        "data": [[1, 2], [2, 3.5], [3, 2.8], [4, 4.6]]
      },
      {
        "name": "Reta ajustada",
        "type": "line",
        "data": [[1, 1.8], [4, 4.5]]
      }
    ]
  }
}`;

const parsedUserSpec = parseChartSpec(userChartInput);
assert.strictEqual(parsedUserSpec.title.text, "Regressão linear simples (dados ilustrativos)");
assert.strictEqual(parsedUserSpec.series.length, 2);
assert.strictEqual(parsedUserSpec.series[0].type, 'scatter');
assert.strictEqual(parsedUserSpec.series[1].type, 'line');
console.log('   ✓ User screenshot chart specification parsed successfully');

// Test 3: Markdown code fences handling
const fencedChartInput = `\`\`\`chart
{
  "version": 1,
  "renderer": "echarts",
  "spec": {
    "title": { "text": "Gráfico Fenced" },
    "series": [{ "type": "bar", "data": [10, 20, 30] }]
  }
}
\`\`\``;

const parsedFenced = parseChartSpec(fencedChartInput);
assert.strictEqual(parsedFenced.title.text, "Gráfico Fenced");
assert.strictEqual(parsedFenced.series[0].type, 'bar');
console.log('   ✓ Fenced chart markdown parsed successfully');

// Test 4: Trailing commas tolerant parsing
const trailingCommasInput = `{
  "version": 1,
  "renderer": "echarts",
  "spec": {
    "title": { "text": "Teste Vírgula" },
    "series": [
      { "type": "pie", "data": [{ "value": 100, "name": "A" },], },
    ],
  },
}`;

const parsedTrailing = parseChartSpec(trailingCommasInput);
assert.strictEqual(parsedTrailing.title.text, "Teste Vírgula");
assert.strictEqual(parsedTrailing.series[0].type, 'pie');
console.log('   ✓ Trailing commas auto-repaired successfully');

console.log('--- All Chart tests passed! ---');
