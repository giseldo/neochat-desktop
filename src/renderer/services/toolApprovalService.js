const TOOL_APPROVAL_PREFIX = 'tool_approval_';
const YOLO_MODE_KEY = 'tool_approval_yolo_mode';

export async function getToolApprovalStatus(toolName, serverLabel) {
  if (window.electron?.toolPermissions?.resolve) {
    return window.electron.toolPermissions.resolve(toolName, serverLabel);
  }
  try {
    if (localStorage.getItem(YOLO_MODE_KEY) === 'true') return 'yolo';
    if (localStorage.getItem(`${TOOL_APPROVAL_PREFIX}${toolName}`) === 'always') return 'always';
    return 'prompt';
  } catch (error) {
    console.error('Error reading tool approval status from localStorage:', error);
    return 'prompt';
  }
}

export async function setToolApprovalStatus(toolName, status, serverLabel) {
  if (window.electron?.toolPermissions) {
    if (status === 'always') return window.electron.toolPermissions.set(toolName, 'allow', serverLabel);
    if (status === 'never') return window.electron.toolPermissions.set(toolName, 'deny', serverLabel);
    if (status === 'yolo') return window.electron.toolPermissions.setGlobal({ allowAll: true });
    return;
  }
  try {
    if (status === 'yolo') {
      localStorage.setItem(YOLO_MODE_KEY, 'true');
    } else if (['always', 'once', 'deny'].includes(status)) {
      if (status === 'always') localStorage.setItem(`${TOOL_APPROVAL_PREFIX}${toolName}`, 'always');
      localStorage.removeItem(YOLO_MODE_KEY);
    }
  } catch (error) {
    console.error('Error writing tool approval status to localStorage:', error);
  }
}
