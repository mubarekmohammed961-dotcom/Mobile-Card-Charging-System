export default function StatCard({ title, value, subtitle, icon, colorClass = "kpi-blue" }) {
  return (
    <div className={`kpi-card ${colorClass}`}>
      <div className="kpi-icon-wrap">{icon}</div>
      <div className="kpi-label">{title}</div>
      <div className="kpi-value">{value}</div>
      {subtitle && <div className="kpi-sub">{subtitle}</div>}
    </div>
  );
}
