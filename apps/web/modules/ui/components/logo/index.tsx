export const Logo = ({ className, ...props }: { className?: string; [key: string]: any }) => {
  return (
    <div className={className} {...props}>
      <span
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 700,
          fontSize: "2rem",
          letterSpacing: "-0.02em",
        }}>
        <span style={{ color: "#2563EB" }}>hive</span>
        <span style={{ color: "#D4A843" }}>cfm</span>
      </span>
    </div>
  );
};
