import "./scaleloader.css";

/* ScaleLoader: five bars that scale on a staggered wave.
 *
 * The react-spinners component of the same name, rebuilt rather than
 * installed. It is a keyframe on five spans, and the library would have come
 * with emotion as a peer dependency for that — this project draws its own
 * icons and charts for the same reason. Same visual: 5 bars, 4px wide, 35px
 * tall, 2px radius, scaleY 1 → 0.4 → 1 over 1s with a 0.1s stagger.
 *
 * Brand blue by default and `currentColor` when it needs to sit on a filled
 * button, since a fixed blue on an ink ground would disappear.
 */
export default function ScaleLoader({
  size = 35,
  width = 4,
  gap = 2,
  color,
  label = "Loading",
  inline = false,
}) {
  return (
    <span
      className={"sl" + (inline ? " sl--inline" : "")}
      style={{
        "--sl-h": `${size}px`,
        "--sl-w": `${width}px`,
        "--sl-gap": `${gap}px`,
        ...(color ? { "--sl-color": color } : null),
      }}
      role="status"
      aria-label={label}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </span>
  );
}
