import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initDemoFlag } from "./lib/demoMode";
import "./styles/global.css";

function start() {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

// Demo mode is a separate chunk, fetched only when ?demo=1 has been used, and
// installed before the first render so the opening request already sees it.
// The env check is inlined (not via a helper) so Vite can fold it to `false`
// in a normal build and drop the dynamic import — and the demo chunk — from
// dist entirely, rather than leaving it sitting there unfetched.
if ((import.meta.env.DEV || import.meta.env.VITE_DEMO === "1") && initDemoFlag()) {
  import("./lib/demoApi").then((m) => {
    m.install();
    start();
  });
} else {
  start();
}
