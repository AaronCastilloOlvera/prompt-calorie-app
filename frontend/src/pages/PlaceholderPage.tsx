export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-gray-500">Próximamente.</p>
    </section>
  );
}
