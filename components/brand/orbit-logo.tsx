import Image from "next/image";

export function OrbitLogo({
  alt = "Orbit",
  className = "",
  preload = false,
}: {
  alt?: string;
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      alt={alt}
      className={`h-auto max-w-full ${className}`}
      height={252}
      preload={preload}
      src="/orbit-logo.png"
      unoptimized
      width={600}
    />
  );
}
