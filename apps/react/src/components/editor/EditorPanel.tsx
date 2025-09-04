import EditorLayoutPanel from './panels/EditorLayoutPanel.js';
import EditorTextPanel from './panels/EditorTextPanel.js';
import EditorRadiusPanel from './panels/EditorRadiusPanel.js';
import EditorDimensionPanel from './panels/EditorDimensionPanel.js';

export default function EditorPanel() {
  return (
    <div className="flex flex-col gap-2 p-4 border-l border-l-slate-800">
      <EditorLayoutPanel />
      <EditorDimensionPanel />
      <EditorTextPanel />
      <EditorRadiusPanel />
    </div>
  );
}
