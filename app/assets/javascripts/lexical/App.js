import "./styles.css";
import Editor from "./Editor";

export default function App() {
  return (
    <div className="App">
      <Editor onChange={onChange} />
    </div>
  );
}
const onChange = (editorState) => {
    editorState.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS);
        console.log(markdown);
    });
}