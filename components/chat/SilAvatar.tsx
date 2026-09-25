import Image from "next/image";

export function SilAvatar() {
  return (
    <Image
      src="/sil-logo.png"
      alt="SIL"
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-lg border border-border/60 bg-card object-contain"
    />
  );
}
