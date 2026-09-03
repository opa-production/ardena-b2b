/* The three drifting bands behind every auth page.
 *
 * A component rather than markup repeated in Login, Signup and Forgot password,
 * because it is the same three divs in all three and the shapes live in
 * auth.css. Purely decorative, so it is hidden from the accessibility tree.
 */
export default function AuthWaves() {
  return (
    <div aria-hidden="true">
      <span className="auth-wave auth-wave--back" />
      <span className="auth-wave auth-wave--mid" />
      <span className="auth-wave auth-wave--front" />
    </div>
  );
}
