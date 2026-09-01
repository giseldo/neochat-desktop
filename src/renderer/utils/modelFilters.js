export function filterModels(modelList, filterText, excludeText, configs, disabledList = []) {
  let filteredModels = modelList;
  if (Array.isArray(disabledList) && disabledList.length > 0) {
    filteredModels = filteredModels.filter((modelId) => {
      const rawId = configs[modelId]?.rawModelId;
      return !disabledList.includes(modelId) && (!rawId || !disabledList.includes(rawId));
    });
  }

  const searchableValues = (modelId) => {
    const config = configs[modelId];
    const displayName = config?.displayName || config?.rawModelId || (modelId.includes('::') ? modelId.split('::')[1] : modelId);
    return [modelId, displayName, config?.rawModelId || ''].map(value => value.toLowerCase());
  };
  const parseTerms = value => String(value || '').split('\n').map(term => term.trim().toLowerCase()).filter(Boolean);
  const includesAny = (modelId, terms) => {
    const values = searchableValues(modelId);
    return terms.some(term => values.some(value => value.includes(term)));
  };

  const includeTerms = parseTerms(filterText);
  if (includeTerms.length > 0) filteredModels = filteredModels.filter(modelId => includesAny(modelId, includeTerms));

  const excludeTerms = parseTerms(excludeText);
  if (excludeTerms.length > 0) filteredModels = filteredModels.filter(modelId => !includesAny(modelId, excludeTerms));
  return filteredModels;
}
