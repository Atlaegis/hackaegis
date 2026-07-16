export function WaveLoader() {
  return (
    <div className="wave-loader">
      <div className="wave-loader__rings" />
      <div>
        <div className="wave-loader__title text-2xl sm:text-4xl">HACKAEGIS</div>
        <div className="wave-loader__dots">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="wave-loader__wave" />
    </div>
  );
}
