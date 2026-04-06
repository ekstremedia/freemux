export function suggestOutputPath(inputPath: string, container: string): string {
  if (!inputPath) {
    return "";
  }

  const extension = container.startsWith(".") ? container : `.${container}`;
  const normalized = inputPath.replace(/\\/g, "/");
  const lastDotIndex = normalized.lastIndexOf(".");
  const lastSlashIndex = normalized.lastIndexOf("/");

  if (lastDotIndex > lastSlashIndex) {
    return `${inputPath.slice(0, lastDotIndex)}${extension}`;
  }

  return `${inputPath}${extension}`;
}

export function basename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

export function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash === -1 ? "" : normalized.slice(0, lastSlash);
}

export function suggestBatchOutputPath(
  inputPath: string,
  outputFolder: string,
  container: string,
): string {
  const name = basename(inputPath);
  const extension = container.startsWith(".") ? container : `.${container}`;
  const dotIndex = name.lastIndexOf(".");
  const stem = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const separator = outputFolder.includes("\\") ? "\\" : "/";
  const trimmed = outputFolder.replace(/[\\/]+$/, "");
  return `${trimmed}${separator}${stem}${extension}`;
}
