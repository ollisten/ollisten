import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function LlmMessage(props: {
    text: string;
}) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.text}</ReactMarkdown>
    );
}
