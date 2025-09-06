import EditorLayoutPanel from './panels/EditorLayoutPanel.js';
import EditorTextPanel from './panels/EditorTextPanel.js';
import EditorRadiusPanel from './panels/EditorRadiusPanel.js';
import EditorDimensionPanel from './panels/EditorDimensionPanel.js';
import EditorOutlinePanel from './panels/EditorOutlinePanel.js';

export default function EditorPanel() {
  return (
    <div className="flex flex-col gap-3 p-4 border-l border-l-slate-800 overflow-x-hidden overflow-y-auto">
      <EditorTextPanel />
      <EditorLayoutPanel />
      <EditorDimensionPanel />
      <EditorOutlinePanel />
      <EditorRadiusPanel />
    </div>
  );
}
