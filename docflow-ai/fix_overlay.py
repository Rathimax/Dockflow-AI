import re

with open("app/edit-pdf/page.tsx", "r") as f:
    lines = f.readlines()

# Find ElementOverlay start and end
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "const ElementOverlay = ({ el }: { el: Element }) => {" in line:
        start_idx = i
    if start_idx != -1 and i > start_idx and line.strip() == "};" and lines[i-1].strip() == "return null;":
        end_idx = i
        break

if start_idx == -1 or end_idx == -1:
    print("Could not find ElementOverlay")
    exit(1)

overlay_lines = lines[start_idx:end_idx+1]
lines = lines[:start_idx] + lines[end_idx+1:]

props_interface = """
interface ElementOverlayProps {
  el: Element;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  activeTool: Tool;
  canvasRef: React.RefObject<HTMLDivElement>;
  currentPageIndex: number;
  editorState: EditorState;
  setEditorState: React.Dispatch<React.SetStateAction<EditorState>>;
  updateState: (updater: (prev: EditorState) => EditorState) => void;
  saveToHistory: (state: EditorState) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  deleteElement: (id: string) => void;
}
"""

new_overlay = props_interface + "\n" + overlay_lines[0].replace(
    "const ElementOverlay = ({ el }: { el: Element }) => {",
    "const ElementOverlay = ({ el, selectedElementId, setSelectedElementId, activeTool, canvasRef, currentPageIndex, editorState, setEditorState, updateState, saveToHistory, bringToFront, sendToBack, deleteElement }: ElementOverlayProps) => {"
)
for line in overlay_lines[1:]:
    # Remove the `const isSelected = selectedElementId === el.id;` line because we still need it, wait, we pass selectedElementId, so we still need it!
    # The line is `const isSelected = selectedElementId === el.id;` which works fine!
    new_overlay += line

# Find where to insert it (before export default function EditPDFPage() {)
insert_idx = -1
for i, line in enumerate(lines):
    if "export default function EditPDFPage() {" in line:
        insert_idx = i
        break

lines.insert(insert_idx, new_overlay + "\n")

# Now update the usage of ElementOverlay
for i, line in enumerate(lines):
    if "<ElementOverlay key={el.id} el={el} />" in line:
        lines[i] = line.replace("<ElementOverlay key={el.id} el={el} />", """<ElementOverlay 
                            key={el.id} 
                            el={el} 
                            selectedElementId={selectedElementId}
                            setSelectedElementId={setSelectedElementId}
                            activeTool={activeTool}
                            canvasRef={canvasRef}
                            currentPageIndex={currentPageIndex}
                            editorState={editorState}
                            setEditorState={setEditorState}
                            updateState={updateState}
                            saveToHistory={saveToHistory}
                            bringToFront={bringToFront}
                            sendToBack={sendToBack}
                            deleteElement={deleteElement}
                        />""")

with open("app/edit-pdf/page.tsx", "w") as f:
    f.writelines(lines)

print("Done")
