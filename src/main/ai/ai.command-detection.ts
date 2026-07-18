export function isLikelyShellCommand(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/\n/.test(trimmed)) return true;
  if (/[`$][({]/.test(trimmed)) return true;
  if (/\b(?:awk|cat|cut|df|echo|find|free|grep|head|ifconfig|ip|ls|nmap|ping|ps|route|sed|sw_vers|sysctl|tail|top|uname|vm_stat)\b/.test(trimmed)) {
    return true;
  }
  if (/[|&;<>]/.test(trimmed)) return true;
  if (/^(?:\w+=.+\s+)+(?:[A-Za-z_./-]+)/.test(trimmed)) return true;
  if (/^[./~A-Za-z0-9_-]+\s+[-]/.test(trimmed)) return true;
  return false;
}
