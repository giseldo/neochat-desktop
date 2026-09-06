export function filterModels(modelList, configs, disabledList = []) {
  // Support both (modelList, configs, disabledList) and legacy (modelList, filterText, excludeText, configs, disabledList)
  let resolvedConfigs = configs;
  let resolvedDisabledList = disabledList;
  if (typeof configs === 'string' || typeof disabledList === 'string') {
    resolvedConfigs = arguments[3] || {};
    resolvedDisabledList = Array.isArray(arguments[4]) ? arguments[4] : [];
  }

  let filteredModels = modelList || [];
  if (Array.isArray(resolvedDisabledList) && resolvedDisabledList.length > 0) {
    filteredModels = filteredModels.filter((modelId) => {
      const rawId = resolvedConfigs?.[modelId]?.rawModelId;
      return !resolvedDisabledList.includes(modelId) && (!rawId || !resolvedDisabledList.includes(rawId));
    });
  }

  return filteredModels;
}
