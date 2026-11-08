import { descriptionHtml } from '@inventory/domain';
import { quillScript, quillStyle } from '../generated/quill-assets';
export type EditorColors = {
  background: string;
  foreground: string;
  border: string;
  primary: string;
  font: string;
  size: number;
};
const scriptValue = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');
/** A local, isolated editor document. No remote scripts, images, credentials or network requests. */
export function quillDocument(
  value: string,
  label: string,
  colors: EditorColors,
  disabled: boolean,
) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"><style>${quillStyle}body{margin:0}.ql-editor{min-height:140px;max-height:220px}.ql-toolbar{display:flex;flex-wrap:wrap}.ql-toolbar button{min-width:40px;min-height:40px}.ql-tooltip{left:0!important;max-width:95%;white-space:normal}</style></head><body><div id="toolbar">
  <button class="ql-bold" aria-label="Bold" title="Bold"></button><button class="ql-italic" aria-label="Italic" title="Italic"></button><button class="ql-underline" aria-label="Underline" title="Underline"></button><button class="ql-list" value="ordered" aria-label="Numbered list" title="Numbered list"></button><button class="ql-list" value="bullet" aria-label="Bulleted list" title="Bulleted list"></button><button class="ql-link" aria-label="Insert link" title="Insert link"></button><button class="ql-clean" aria-label="Clear formatting" title="Clear formatting"></button></div><div id="editor"></div>
<script>${quillScript.replaceAll('</script', '<\\/script')}</script><script>
const editor=new Quill('#editor',{theme:'snow',formats:['bold','italic','underline','list','link'],modules:{toolbar:'#toolbar'}});
editor.root.setAttribute('role','textbox');editor.root.setAttribute('aria-label',${scriptValue(label)});editor.root.setAttribute('aria-multiline','true');
editor.setContents(editor.clipboard.convert({html:${scriptValue(descriptionHtml(value))}}),'silent');editor.enable(${!disabled});
window.updateAppearance=function(colors,disabled){document.body.style.background=colors.background;document.body.style.color=colors.foreground;document.body.style.fontFamily=colors.font;document.body.style.fontSize=colors.size+'px';document.querySelectorAll('.ql-container,.ql-toolbar').forEach(e=>{e.style.font='inherit';e.style.borderColor=colors.border});document.querySelectorAll('.ql-stroke').forEach(e=>e.style.stroke=colors.foreground);editor.enable(!disabled);};window.updateAppearance(${scriptValue(colors)},${disabled});
window.setDescription=function(html){editor.setContents(editor.clipboard.convert({html:html}),'silent');};
editor.on('text-change',function(){const message=JSON.stringify({type:'description',html:editor.getSemanticHTML()});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(message);else window.parent.postMessage(message,'*');});
window.addEventListener('message',function(event){try{const message=typeof event.data==='string'?JSON.parse(event.data):event.data;if(message.type==='value')window.setDescription(message.html);if(message.type==='appearance')window.updateAppearance(message.colors,message.disabled);}catch{}});
</script></body></html>`;
}
