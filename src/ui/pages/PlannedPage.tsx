// Pages foreseen but left empty for now (Tobias 2026-11-10: „Sieh die Datenübertragung an ein
// anderes Gerät vor, und den Zusammenschluss mit anderen Geräten für einen Prüfungstag. Diese
// Funktionen können aber vorerst leer bleiben.“)

const PLANNED = {
  uebertragen: {
    title: 'Übertragen',
    text: [
      'Hier wird die Gruppe mit allen Kindern und Werten an ein anderes Gerät übergeben – ohne Internet, z. B. über QR-Codes von Bildschirm zu Kamera.',
      'Bis dahin: auf der Seite „Datei“ als Datei speichern und die Datei auf dem anderen Gerät öffnen.',
    ],
  },
  pruefungstag: {
    title: 'Prüfungstag',
    text: [
      'Hier schließen sich mehrere Geräte für einen Prüfungstag zusammen: jede Station erfasst ihre Übung, am Ende stehen alle Werte auf jedem Gerät.',
      'Bis dahin erfasst jedes Gerät für sich; zusammenführen lässt sich noch nichts.',
    ],
  },
} as const;

export function PlannedPage({ page }: { page: keyof typeof PLANNED }) {
  const { title, text } = PLANNED[page];
  return (
    <section>
      <h2>{title}</h2>
      <p className="message info">Diese Funktion ist vorgesehen und kommt noch.</p>
      {text.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  );
}
