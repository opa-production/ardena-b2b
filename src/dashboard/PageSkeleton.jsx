import "./skeleton.css";

/* Shimmer skeletons shown while a page's data loads. The variant mirrors
   the layout of the page being fetched, YouTube-style: real card chrome,
   grey blocks where the content will land. */

function variantFor(path) {
  const parts = path.split("/").filter(Boolean); // ["dashboard", ...]
  if (parts.length === 1) return "overview";
  if (parts[2] === "new") return "form";
  if (parts.length === 3 && ["fleet", "bookings", "clients"].includes(parts[1])) return "details";
  if (parts.length === 3) return "table"; // payments/all, verification/all
  if (["billing", "verification", "payments", "support", "settings"].includes(parts[1])) return "grid";
  return "table";
}

const Line = ({ w, h = 12, className = "" }) => (
  <span className={`sk ${className}`} style={{ width: w, height: h }} />
);

function StatRow() {
  return (
    <div className="stat-grid fleet-stats">
      {[0, 1, 2, 3].map((i) => (
        <article className="stat-card" key={i}>
          <Line w="55%" h={11} />
          <Line w="70%" h={24} className="sk-gap" />
          <Line w="45%" h={10} className="sk-gap-sm" />
        </article>
      ))}
    </div>
  );
}

function CardLines({ rows = 5 }) {
  return (
    <>
      <Line w="30%" h={14} />
      <Line w="48%" h={10} className="sk-gap-sm" />
      <div className="sk-rows">
        {Array.from({ length: rows }, (_, i) => (
          <Line key={i} w={`${92 - (i % 3) * 14}%`} h={12} />
        ))}
      </div>
    </>
  );
}

function HeadCard() {
  return (
    <header className="head-card">
      <div className="head-left">
        <span className="sk sk-circle" />
        <div>
          <Line w={160} h={16} />
          <Line w={220} h={10} className="sk-gap-sm" />
        </div>
      </div>
      <Line w={120} h={34} />
    </header>
  );
}

export default function PageSkeleton({ path }) {
  const variant = variantFor(path);

  if (variant === "overview") {
    return (
      <div aria-hidden="true">
        <StatRow />
        <div className="chart-row">
          <section className="chart-card">
            <CardLines rows={0} />
            <span className="sk sk-block" />
          </section>
          <section className="chart-card">
            <CardLines rows={0} />
            <span className="sk sk-block" />
          </section>
        </div>
        <div className="overview-grid">
          <section className="chart-card">
            <CardLines rows={0} />
            <span className="sk sk-block" />
          </section>
          <div className="overview-side">
            <section className="panel-card">
              <CardLines rows={3} />
            </section>
            <section className="panel-card">
              <CardLines rows={3} />
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "details" || variant === "form") {
    return (
      <div aria-hidden="true">
        <HeadCard />
        <div className="details-grid">
          <section className="panel-card">
            <CardLines rows={variant === "form" ? 8 : 6} />
          </section>
          <div className="details-side">
            <section className="panel-card">
              <CardLines rows={3} />
            </section>
            <section className="panel-card">
              <CardLines rows={2} />
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div aria-hidden="true">
        <StatRow />
        <div className="details-grid">
          <section className="panel-card">
            <CardLines rows={6} />
          </section>
          <div className="details-side">
            <section className="panel-card">
              <CardLines rows={3} />
            </section>
            <section className="panel-card">
              <CardLines rows={3} />
            </section>
          </div>
        </div>
      </div>
    );
  }

  // table: stats + toolbar + rows
  return (
    <div aria-hidden="true">
      <StatRow />
      <section className="panel-card">
        <div className="sk-toolbar">
          <Line w={300} h={36} />
          <Line w={260} h={36} />
        </div>
        <div className="sk-rows">
          {Array.from({ length: 7 }, (_, i) => (
            <Line key={i} w="100%" h={15} />
          ))}
        </div>
      </section>
    </div>
  );
}
