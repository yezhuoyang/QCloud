import Editor from '@monaco-editor/react'

interface CodeEditorProps {
  value: string
  onChange: (value: string | undefined) => void
}

function CodeEditor({ value, onChange }: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      theme="vs-dark"
      value={value}
      onChange={onChange}
      options={{
        fontSize: 14,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        roundedSelection: true,
        cursorStyle: 'line',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        contextmenu: true,
        folding: true,
        foldingHighlight: true,
        showFoldingControls: 'mouseover',
        bracketPairColorization: { enabled: true },
      }}
    />
  )
}

export default CodeEditor
