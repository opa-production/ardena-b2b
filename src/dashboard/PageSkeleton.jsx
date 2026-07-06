import "./skeleton.css";

/* Shimmer skeletons shown while a page's data loads. Each route gets a
   skeleton that mirrors its real layout, YouTube-style: real card chrome,
   grey blocks where the content will land. */

const Line = ({ w, h = 12, className = "" }) => (
  <span className={`sk ${className}`} style={{ width: w, height: h }} />
);

function StatRow({ count = 4 }) {
  return (
    <div className="stat-grid fleet-stats">
      {Array.from({ length: count }, (_, i) => (
        <article className="stat-card" key={i}>
          <Line w="55%" h={11} />
          <Line w="70%" h={24} className="sk-gap" />
          <Line w="45%" h={10} className="sk-gap-sm" />
        </article>
      ))}
    </div>
  );
}

function CardHead() {
  return (
    <>
      <Line w="30%" h={14} />
      <Line w="48%" h={10} className="sk-gap-sm" />
    </>
  );
}

function CardLines({ rows = 5 }) {
  return (
    <>
      <CardHead />
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

function Toolbar() {
  return (
    <div className="sk-toolbar">
      <Line w={300} h={36} />
      <Line w={260} h={36} />
    </div>
  );
}

function TableCard({ rows = 7 }) {
  return (
    <section className="panel-card">
      <Toolbar />
      <div className="sk-rows">
        {Array.from({ length: rows }, (_, i) => (
          <Line key={i} w="100%" h={15} />
        ))}
      </div>
    </section>
  );
}

/* Paired label + input blocks, like the real forms */
function FormFields({ pairs = 3 }) {
  return (
    <div className="sk-form-grid">
      {Array.from({ length: pairs * 2 }, (_, i) => (
        <div key={i}>
          <Line w="40%" h={10} />
          <Line w="100%" h={40} className="sk-gap-sm" />
        </div>
      ))}
    </div>
  );
}

/* Icon + two lines, like a notification row */
function ListItems({ rows = 6 }) {
  return (
    <div className="sk-list">
      {Array.from({ length: rows }, (_, i) => (
        <div className="sk-list-item" key={i}>
          <span className="sk sk-square" />
          <div className="sk-list-body">
            <Line w={`${44 + (i % 3) * 10}%`} h={12} />
            <Line w={`${64 + (i % 2) * 14}%`} h={10} className="sk-gap-sm" />
          </div>
          <Line w={64} h={10} />
        </div>
      ))}
    </div>
  );
}

/* Chat thread: alternating bubbles + composer */
function ChatCard() {
  const bubbles = [
    { side: "", w: "52%" },
    { side: "right", w: "40%" },
    { side: "", w: "58%" },
    { side: "right", w: "34%" },
    { side: "", w: "46%" },
  ];
  return (
    <section className="panel-card">
      <CardHead />
      <div className="sk-chat">
        {bubbles.map((b, i) => (
          <span
            key={i}
            className={`sk sk-bubble ${b.side}`}
            style={{ width: b.w }}
          />
        ))}
      </div>
      <div className="sk-composer">
        <Line w="100%" h={40} />
        <Line w={90} h={40} />
      </div>
    </section>
  );
}

function SideCards({ cards = [3, 2] }) {
  return (
    <div className="details-side">
      {cards.map((rows, i) => (
        <section className="panel-card" key={i}>
          <CardLines rows={rows} />
        </section>
      ))}
    </div>
  );
}

export default function PageSkeleton({ path }) {
  const parts = path.split("/").filter(Boolean); // ["dashboard", ...]
  const section = parts[1] || "";
  const sub = parts[2];

  // ---- Overview: KPIs + two charts + wide chart with side widgets
  if (!section) {
    return (
      <div aria-hidden="true">
        <StatRow />
        <div className="chart-row">
          {[0, 1].map((i) => (
            <section className="chart-card" key={i}>
              <CardHead />
              <span className="sk sk-block" />
            </section>
          ))}
        </div>
        <div className="overview-grid">
          <section className="chart-card">
            <CardHead />
            <span className="sk sk-block" />
          </section>
          <SideCards cards={[3, 3]} />
        </div>
      </div>
    );
  }

  // ---- Forms: Add vehicle (side actions card), New booking (single card)
  if (sub === "new") {
    const single = section === "bookings";
    return (
      <div aria-hidden="true">
        <HeadCard />
        {single ? (
          <section className="panel-card form-card">
            <FormFields pairs={4} />
            <Line w="100%" h={54} className="sk-gap" />
            <Line w={200} h={44} className="sk-gap" />
          </section>
        ) : (
          <div className="details-grid">
            <section className="panel-card">
              <FormFields pairs={4} />
              <Line w="100%" h={70} className="sk-gap" />
            </section>
            <SideCards cards={[3, 0]} />
          </div>
        )}
      </div>
    );
  }

  // ---- Detail pages: header card + info card stack + side cards
  if (sub && ["fleet", "bookings", "clients"].includes(section)) {
    return (
      <div aria-hidden="true">
        <HeadCard />
        <div className="details-grid">
          <div className="settings-main">
            <section className="panel-card">
              <CardLines rows={6} />
            </section>
            <section className="panel-card">
              <CardLines rows={3} />
            </section>
          </div>
          <SideCards cards={[3, 2]} />
        </div>
      </div>
    );
  }

  // ---- Full-list pages (payments/all, verification/all): header card + table
  if (sub) {
    return (
      <div aria-hidden="true">
        <HeadCard />
        <TableCard rows={8} />
      </div>
    );
  }

  // ---- Notifications: no KPIs, one panel of icon rows
  if (section === "notifications") {
    return (
      <div aria-hidden="true">
        <section className="panel-card">
          <Toolbar />
          <ListItems rows={7} />
        </section>
      </div>
    );
  }

  // ---- Settings: no KPIs, two form cards + side cards
  if (section === "settings") {
    return (
      <div aria-hidden="true">
        <div className="details-grid">
          <div className="settings-main">
            <section className="panel-card">
              <CardHead />
              <div className="sk-gap">
                <FormFields pairs={2} />
              </div>
            </section>
            <section className="panel-card">
              <CardHead />
              <ListItems rows={4} />
            </section>
          </div>
          <SideCards cards={[4, 3]} />
        </div>
      </div>
    );
  }

  // ---- Support: no KPIs, chat thread + side cards
  if (section === "support") {
    return (
      <div aria-hidden="true">
        <div className="details-grid">
          <ChatCard />
          <SideCards cards={[3, 3]} />
        </div>
      </div>
    );
  }

  // ---- Staff: 3 KPIs + table with side cards
  if (section === "staff") {
    return (
      <div aria-hidden="true">
        <StatRow count={3} />
        <div className="details-grid">
          <TableCard rows={6} />
          <SideCards cards={[4, 3]} />
        </div>
      </div>
    );
  }

  // ---- Payments (finance): KPIs + trend chart + donut + processed table
  if (section === "payments") {
    return (
      <div aria-hidden="true">
        <StatRow />
        <div className="payments-grid">
          {[0, 1].map((i) => (
            <section className="chart-card" key={i}>
              <CardHead />
              <span className="sk sk-block" />
            </section>
          ))}
        </div>
        <TableCard rows={6} />
      </div>
    );
  }

  // ---- Billing: two graphs on top + invoice list
  if (section === "billing") {
    return (
      <div aria-hidden="true">
        <div className="chart-row">
          {[0, 1].map((i) => (
            <section className="chart-card" key={i}>
              <CardHead />
              <span className="sk sk-block" />
            </section>
          ))}
        </div>
        <section className="panel-card">
          <CardLines rows={3} />
        </section>
      </div>
    );
  }

  // ---- Verification: KPIs + card grid
  if (["verification"].includes(section)) {
    return (
      <div aria-hidden="true">
        <StatRow />
        <div className="details-grid">
          <div className="settings-main">
            <section className="panel-card">
              <CardLines rows={5} />
            </section>
            <section className="panel-card">
              <CardLines rows={4} />
            </section>
          </div>
          <SideCards cards={[4, 3]} />
        </div>
      </div>
    );
  }

  // ---- Fleet / Bookings / Clients: KPIs + table
  return (
    <div aria-hidden="true">
      <StatRow />
      <TableCard rows={7} />
    </div>
  );
}
