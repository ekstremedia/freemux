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
