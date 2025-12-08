export function AboutPanel() {
    return (
        <div className="h-full flex flex-col gap-3 p-3 text-stone-800">
            <p className="text-size-lg text-stone-700 leading-relaxed">
                cozytab is created by {inlineLink("https://daniel-ives.com", "Daniel Ives")}.
                but it wouldn't exist without the incredible design, product ideas, and artwork
                by his wife, Quincy Ives.
                <br />
                <br />
                If you're enjoying cozytab, consider supporting us at{" "}
                {inlineLink("https://buymeacoffee.com/danielives", "Buy Me a Coffee")}.
            </p>
        </div>
    );
}

function inlineLink(href: string, children: React.ReactNode) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
        >
            {children}
        </a>
    );
}
