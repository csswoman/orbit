export function shouldClearPendingImageParent(pickerWasOpen: boolean, hasSelectedFile: boolean): boolean {
  return pickerWasOpen && !hasSelectedFile;
}
