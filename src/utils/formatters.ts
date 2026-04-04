export function formatDuration(seconds: number | null): string {
  if (seconds === null) {
    return "n/a";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  return [hours, minutes, remainingSeconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) {
    return "n/a";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatBitrate(bitRate: number | null): string {
  if (bitRate === null) {
    return "n/a";
  }

  if (bitRate >= 1_000_000) {
    return `${(bitRate / 1_000_000).toFixed(2)} Mbps`;
  }

  return `${Math.round(bitRate / 1000)} kbps`;
}

export function formatFrameRate(frameRate: number | null): string {
  return frameRate === null ? "n/a" : `${frameRate.toFixed(2)} fps`;
}
