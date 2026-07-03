import { useParams } from "react-router-dom";
import { SECTION_TITLES } from "./nav";

export default function Placeholder() {
  const { section } = useParams();
  const title = SECTION_TITLES[section] || "Coming soon";

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        <p>This module is on the roadmap. We're building it next.</p>
      </div>
      <div className="empty-block">
        <span className="empty-dot" />
        <p>
          <strong>{title}</strong> is coming soon.
        </p>
      </div>
    </>
  );
}
