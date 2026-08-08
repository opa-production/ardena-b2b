import AssistantPanel from "./AssistantPanel";
import usePageTitle from "../hooks/usePageTitle";
import "./overview.css";
import "./support.css";
import "./assistant.css";

/* The assistant owns a sidebar entry of its own — it answers most product
   questions outright, so burying it inside Support made the fast path the
   hidden one. Support is now purely for conversations with people. */
export default function Assistant() {
  usePageTitle("Assistant");

  return (
    <section className="panel-card assist-card">
      <AssistantPanel />
    </section>
  );
}
