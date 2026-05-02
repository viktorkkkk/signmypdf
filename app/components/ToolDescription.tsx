interface ToolDescriptionProps {
  title: string;
  paragraphs: string[];
}

export default function ToolDescription({ title, paragraphs }: ToolDescriptionProps) {
  return (
    <section className="tool-description">
      <div className="container">
        <div className="tool-description-card">
          <h2 className="tool-description-title">{title}</h2>
          {paragraphs.map((p, i) => (
            <p key={i} className="tool-description-text">{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
