import EditorLayoutPanel from './panels/EditorLayoutPanel';
import EditorTextPanel from './panels/EditorTextPanel';
import EditorRadiusPanel from './panels/EditorRadiusPanel';
import EditorDimensionPanel from './panels/EditorDimensionPanel';
import EditorOutlinePanel from './panels/EditorOutlinePanel';

export default function EditorPanel() {
  return (
    <div className="flex flex-col gap-3 p-4 border-l border-l-slate-300/50 dark:border-l-slate-800 overflow-x-hidden overflow-y-auto">
      <EditorTextPanel />
      <EditorLayoutPanel />
      <EditorDimensionPanel />
      <EditorOutlinePanel />
      <EditorRadiusPanel />
    </div>
  );
}
