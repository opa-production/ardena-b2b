import { useEffect, useRef, useState } from "react";

/* Speak instead of typing, for any composer that has a text draft.
 *
 * Shared by the support thread and the assistant, which is the whole reason it
 * is a hook: the two had the same forty lines of SpeechRecognition wiring, and
 * the second copy is where the error handling quietly drifts.
 *
 * Two decisions worth keeping:
 *
 *  - `supported` is returned rather than assumed. The Web Speech API is
 *    Chrome/Edge/Safari only, so callers hide the mic entirely where it does
 *    not exist. A button that does nothing is worse than no button.
 *
 *  - The transcript is *appended* to whatever was already in the box, not
 *    swapped for it. Someone half-types a sentence, gives up and finishes it
 *    out loud; losing what they typed for that would be its own bug. Interim
 *    results stream in as they speak so they can see it being got right or
 *    wrong before they send.
 *
 * `onError` takes ("blocked" | "failed") so the caller can phrase its own
 * message — this hook has no business reaching for a toast.
 */
export default function useDictation({ value, onChange, lang = "en-KE", onError }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  // A recogniser left running after the panel closes keeps the mic light on.
  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;

    // Snapshot what was already typed before the mic opened.
    const base = (value || "").trim();

    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onChange((base ? `${base} ` : "") + text.trim());
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") onError?.("blocked");
      // aborted is us stopping it; no-speech is someone saying nothing.
      else if (e.error !== "aborted" && e.error !== "no-speech") onError?.("failed");
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  return { supported: Boolean(SpeechRecognition), listening, toggle };
}
