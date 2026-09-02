/* Settlements — the accounts Ardena pays out to. Nothing else.
 *
 * This page has been stripped twice, both times in the same direction. It once
 * carried the check-wallet balance, which is money going the other way and
 * belongs beside the checks that spend it, on Verification. It then carried a
 * "how it works" card explaining the difference between collections and cash,
 * which is orientation material — true, but not something you need in front of
 * you while you are keying in an account number. What is left is the list and
 * the button that adds to it.
 */
import PayoutMethods from "./PayoutMethods";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css";
import "./earnings.css";
import "./workspace.css";

export default function Settlements() {
  usePageTitle("Settlements");

  return (
    <>
      <h1 className="sr-only">Settlements</h1>
      <PayoutMethods />
    </>
  );
}
