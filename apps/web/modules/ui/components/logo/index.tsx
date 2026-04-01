import Image from "next/image";

export const Logo = ({ className, ...props }: { className?: string; [key: string]: any }) => {
  return (
    <Image
      src="/hivecfm-logo.svg"
      alt="HiveCFM"
      width={200}
      height={50}
      className={className}
      priority
      {...props}
    />
  );
};
