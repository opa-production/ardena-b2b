import { Link, useParams } from "react-router-dom";
import ComingSoon from "./ComingSoon";
import { SECTION_TITLES } from "./nav";
import usePageTitle from "../hooks/usePageTitle";

/* Any dashboard section that is named but not built yet. It is deliberately
   the same page as every other "not yet" in here — see ComingSoon — so a
   module on the roadmap never looks like a module that broke. */
export default function Placeholder() {
  const { section } = useParams();
  const title = SECTION_TITLES[section] || "This module";
  usePageTitle(title);

  return (
    <>
      <h1 className="sr-only">{title}</h1>
      <ComingSoon
        title={title}
        message="It's on the roadmap and we're building it next. Tell us what you need from it and it moves up the list."
        action={
          <Link to="/dashboard/feature-request" className="btn btn-primary">
            Tell us what you need
          </Link>
        }
      />
    </>
  );
}
