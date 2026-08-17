type GradientBgProps = {
  className?: string;
};

export function GradientBg({ className }: GradientBgProps) {
  return (
    <div aria-hidden="true" className={className ? `gradient-bg ${className}` : "gradient-bg"}>
      <div className="base" />
      <div className="treatment" />
      <div className="glow" />
      <div className="particles" />
      <div className="vignette" />
      <div className="noise" />
    </div>
  );
}
