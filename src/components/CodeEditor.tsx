import { useRef, useEffect } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'

interface CodeEditorProps {
  value: string
  onChange: (value: string | undefined) => void
}

function CodeEditor({ value, onChange }: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const onChangeRef = useRef(onChange)
  const lastEmittedValue = useRef(value)

  // Keep onChange ref fresh without re-registering listeners
  onChangeRef.current = onChange

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
    editor.onDidChangeModelContent(() => {
      const current = editor.getValue()
      lastEmittedValue.current = current
      onChangeRef.current(current)
    })
  }

  // Only apply truly external value changes (e.g. composer → code switch).
  // Skip if value matches what we last emitted — that's just our own onChange echoing back.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (value === lastEmittedValue.current) return
    lastEmittedValue.current = value
    editor.setValue(value)
  }, [value])

  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      theme="vs-dark"
      defaultValue={value}
      onMount={handleMount}
      options={{
        fontSize: 14,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        fontLigatures: false,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'off',
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
        fixedOverflowWidgets: true,
      }}
    />
  )
}

export default CodeEditor
