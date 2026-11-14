/** Errors and notes on top of every page — an error is never only counted or hidden. */
export function Messages({
  errors,
  info,
  onDismissInfo,
}: {
  errors: readonly string[];
  info: string;
  onDismissInfo: () => void;
}) {
  return (
    <>
      {errors.length > 0 && (
        <section className="message error" role="alert">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </section>
      )}
      {info && (
        <p className="message info" role="status">
          {info}{' '}
          <button type="button" className="link-button" onClick={onDismissInfo}>
            ok
          </button>
        </p>
      )}
    </>
  );
}
