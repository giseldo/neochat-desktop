export function filterModels(modelList, configs, filterParam = [], _legacyParam) {
  let resolvedConfigs = configs;
  let enabledList = null;
  let disabledList = [];

  // Support options object { enabledModels, disabledModels }
  if (filterParam && typeof filterParam === 'object' && !Array.isArray(filterParam)) {
    enabledList = Array.isArray(filterParam.enabledModels) ? filterParam.enabledModels : null;
    disabledList = Array.isArray(filterParam.disabledModels) ? filterParam.disabledModels : [];
  } else if (Array.isArray(filterParam)) {
    // Check if legacy arguments were provided
    if (typeof configs === 'string' || typeof filterParam === 'string') {
      resolvedConfigs = arguments[3] || {};
      disabledList = Array.isArray(arguments[4]) ? arguments[4] : [];
    } else {
      // In strict opt-in mode, filterParam is the array of enabled models
      enabledList = filterParam;
    }
  }

  let filteredModels = modelList || [];

  // Strict opt-in: only keep models explicitly present in enabledList
  if (Array.isArray(enabledList)) {
    filteredModels = filteredModels.filter((modelId) => {
      const rawId = resolvedConfigs?.[modelId]?.rawModelId;
      return enabledList.includes(modelId) || (rawId && enabledList.includes(rawId));
    });
  } else if (Array.isArray(disabledList) && disabledList.length > 0) {
    // Legacy fallback to disabledList if enabledList was not specified
    filteredModels = filteredModels.filter((modelId) => {
      const rawId = resolvedConfigs?.[modelId]?.rawModelId;
      return !disabledList.includes(modelId) && (!rawId || !disabledList.includes(rawId));
    });
  }

  return filteredModels;
}
