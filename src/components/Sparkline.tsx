/**
 * Mini-gráfico de línea (SVG en línea, sin librerías). Para tendencias en
 * tarjetas KPI. Server-component seguro.
 */
export default function Sparkline({
  data,
  width = 96,
  height = 28,
  className = "text-brand-500",
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastX = (data.length - 1) * stepX;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 2) - 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      preserveAspectRatio="none"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.25" fill="currentColor" />
    </svg>
  );
}
