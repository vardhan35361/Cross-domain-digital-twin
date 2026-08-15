import { motion } from "framer-motion";

export function Panel({ kicker, title, right, children, testId, className = "" }) {
  return (
    <div className={`panel ${className}`} data-testid={testId}>
      <div className="panel-head">
        <div>{kicker && <span className="section-kicker">{kicker}</span>}<h3>{title}</h3></div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Metric({ label, value, suffix, icon: Icon, tone = "cyan", trend }) {
  return (
    <motion.div className={`metric metric-${tone}`}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}>
      <div className="metric-top"><span>{label}</span>{Icon && <Icon size={14} />}</div>
      <div className="metric-value">{value}{suffix && <small>{suffix}</small>}</div>
      {trend && <div className="metric-trend">{trend}</div>}
    </motion.div>
  );
}

export function Chip({ children, tone = "cyan" }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}
