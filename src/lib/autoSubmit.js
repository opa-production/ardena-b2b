/* Submit a one-time-code form as soon as the last digit lands, typed or pasted,
   so nobody has to reach for the button after the only thing it was waiting on.

   Call from the input's onChange after setting state. The submit is deferred a
   tick so React has re-rendered first and the form's onSubmit reads the full
   code, not the value from before this keystroke. It goes through
   requestSubmit(), so the handler's own guards (busy, length) still apply.

   Only for forms where the code is the last thing to fill in: a form that also
   wants a new password must not submit itself half-done. */
export function submitWhenComplete(e, length = 6) {
  const form = e.target.form;
  const digits = e.target.value.replace(/\D/g, "");
  if (form && digits.length === length) {
    setTimeout(() => form.requestSubmit(), 0);
  }
}
